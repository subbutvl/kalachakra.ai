import type { LetterSystem } from "../schemas/common.js";
import type { RulesVersion } from "../schemas/rules.js";
import type { Settings } from "../schemas/settings.js";
import { EngineError } from "../errors.js";

export type LetterTables = RulesVersion["letters"];
export type YVowelMode = Settings["letters.y_vowel"];

export interface NormalisedName {
  /** Uppercase A to Z with single spaces, e.g. "AARAV MEHRA". */
  text: string;
  /** Name parts in order, e.g. ["AARAV", "MEHRA"]. */
  parts: string[];
}

/**
 * Normalises a typed name for scoring (rules spec 3.1): uppercase, accents
 * stripped, only A to Z kept, spaces separate parts. Anything else (digits,
 * dots in initials, hyphens) becomes a separator.
 */
export function normaliseName(raw: string): NormalisedName {
  const text = raw
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toUpperCase()
    .replace(/[^A-Z]+/g, " ")
    .trim();
  if (text.length === 0) {
    throw new EngineError("invalid_input", "A name needs at least one letter A to Z.", "name");
  }
  return { text, parts: text.split(" ") };
}

export function letterValue(tables: LetterTables, system: LetterSystem, letter: string): number {
  const v = tables[system][letter];
  if (v === undefined) {
    throw new EngineError("invalid_input", `"${letter}" has no ${system} value.`, "name");
  }
  return v;
}

/**
 * Is the letter at position i of a word a vowel (D4)? A, E, I, O, U always
 * are. Y depends on the setting:
 *  - "never" / "always": as named.
 *  - "by_sound": Y is a vowel when it is the only vowel sound in its
 *    syllable, approximated as "not next to another vowel letter". So the Y
 *    in MYRA, LYNN and YVONNE is a vowel; in YASH, RAY, KAVYA, PRIYA it is not.
 */
export function isVowelAt(
  tables: LetterTables,
  word: string,
  i: number,
  yMode: YVowelMode,
): boolean {
  const letter = word[i];
  if (letter === undefined) return false;
  if (tables.vowels.includes(letter)) return true;
  if (letter !== "Y") return false;
  if (yMode === "never") return false;
  if (yMode === "always") return true;
  const prev = word[i - 1];
  const next = word[i + 1];
  const isPlainVowel = (c: string | undefined) => c !== undefined && tables.vowels.includes(c);
  return !isPlainVowel(prev) && !isPlainVowel(next);
}

export interface LetterScore {
  letter: string;
  value: number;
  vowel: boolean;
}

export interface PartScore {
  part: string;
  letters: LetterScore[];
  total: number;
}

export interface NameScore {
  system: LetterSystem;
  name: NormalisedName;
  parts: PartScore[];
  total: number;
  /** Plain-words working, e.g. "AARAV: A=1 + A=1 + R=2 + A=1 + V=6 = 11". */
  trace: string[];
}

/**
 * Scores every letter of a name in one system, part by part. Vowel flags use
 * the Y rule so the same result can feed soul urge and personality later.
 */
export function scoreName(
  tables: LetterTables,
  system: LetterSystem,
  raw: string,
  yMode: YVowelMode,
): NameScore {
  const name = normaliseName(raw);
  const parts = name.parts.map((part): PartScore => {
    const letters = [...part].map((letter, i) => ({
      letter,
      value: letterValue(tables, system, letter),
      vowel: isVowelAt(tables, part, i, yMode),
    }));
    return { part, letters, total: letters.reduce((s, l) => s + l.value, 0) };
  });
  const total = parts.reduce((s, p) => s + p.total, 0);
  const trace = parts.map(
    (p) => `${p.part}: ${p.letters.map((l) => `${l.letter}=${l.value}`).join(" + ")} = ${p.total}`,
  );
  if (parts.length > 1) trace.push(`Total: ${parts.map((p) => p.total).join(" + ")} = ${total}`);
  return { system, name, parts, total, trace };
}

/** Sums only the vowels (soul urge) or only the consonants (personality) of a scored name. */
export function sumByVowel(score: NameScore, vowels: boolean): number {
  return score.parts
    .flatMap((p) => p.letters)
    .filter((l) => l.vowel === vowels)
    .reduce((s, l) => s + l.value, 0);
}
