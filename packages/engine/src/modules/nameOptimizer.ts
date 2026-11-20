import type { ResolvedRules } from "../rules/loader.js";
import { normaliseName, scoreName } from "../core/letters.js";
import { pairScore } from "../core/planets.js";
import { reduce } from "../core/reduce.js";
import { karmicDebtIn } from "../core/result.js";
import { chaldeanNumber, nameFit, type CompoundClass } from "./chaldean.js";

const VOWELS = new Set(["A", "E", "I", "O", "U"]);
const H_AFTER = new Set(["B", "D", "G", "K", "P", "S", "T"]);

export interface Variant {
  name: string;
  edits: string[];
}

/**
 * Spelling variants by phonetic rules (rules spec 3.10): double a consonant,
 * add or double a vowel, swap I and Y, add or drop a silent H, ending A to AA
 * (and AA to A), K to C before A, O, U (and back). At most `maxEdits` edits.
 * With `lockFirst`, the first letter of every word is never changed.
 */
export function generateVariants(
  raw: string,
  maxEdits: number,
  lockFirst: boolean,
  maxCandidates: number,
): Variant[] {
  const base = normaliseName(raw).text;
  const seen = new Map<string, Variant>([[base, { name: base, edits: [] }]]);
  let frontier: Variant[] = [{ name: base, edits: [] }];
  for (let step = 0; step < maxEdits; step++) {
    const next: Variant[] = [];
    for (const v of frontier) {
      for (const [name, edit] of oneEdit(v.name, lockFirst)) {
        if (seen.has(name) || !readable(name)) continue;
        const nv = { name, edits: [...v.edits, edit] };
        seen.set(name, nv);
        next.push(nv);
        if (seen.size > maxCandidates) return [...seen.values()].slice(1);
      }
    }
    frontier = next;
  }
  return [...seen.values()].slice(1);
}

function oneEdit(name: string, lockFirst: boolean): [string, string][] {
  const out: [string, string][] = [];
  const words = name.split(" ");
  words.forEach((w, wi) => {
    const put = (nw: string, edit: string) => {
      const copy = [...words];
      copy[wi] = nw;
      out.push([copy.join(" "), edit]);
    };
    const start = lockFirst ? 1 : 0;
    for (let i = start; i < w.length; i++) {
      const c = w[i]!;
      const prev = w[i - 1];
      const next = w[i + 1];
      // Double a consonant (not one already doubled).
      if (!VOWELS.has(c) && c !== "Y" && c !== next && c !== prev) {
        put(w.slice(0, i + 1) + c + w.slice(i + 1), `double ${c}`);
      }
      // Double a vowel (not one already doubled).
      if (VOWELS.has(c) && c !== next && c !== prev) {
        put(w.slice(0, i + 1) + c + w.slice(i + 1), `double ${c}`);
      }
      // Undouble AA at the end (ending AA to A).
      if (c === "A" && prev === "A" && i === w.length - 1 && i - 1 >= start) {
        put(w.slice(0, i), "ending AA to A");
      }
      // Swap I and Y.
      if (c === "I") put(w.slice(0, i) + "Y" + w.slice(i + 1), "I to Y");
      if (c === "Y") put(w.slice(0, i) + "I" + w.slice(i + 1), "Y to I");
      // Silent H: add after a stop or S, or drop an H that follows a consonant.
      if (H_AFTER.has(c) && next !== "H") put(w.slice(0, i + 1) + "H" + w.slice(i + 1), `add H after ${c}`);
      if (c === "H" && prev !== undefined && !VOWELS.has(prev)) put(w.slice(0, i) + w.slice(i + 1), "drop silent H");
      // K and C before A, O, U keep the sound.
      if (c === "K" && next && "AOU".includes(next)) put(w.slice(0, i) + "C" + w.slice(i + 1), "K to C");
      if (c === "C" && next && "AOU".includes(next)) put(w.slice(0, i) + "K" + w.slice(i + 1), "C to K");
    }
    // Add a vowel at the end (Aarav to Aarave), or ending A to AA.
    const last = w.at(-1)!;
    if (w.length > start) {
      if (last === "A") put(w + "A", "ending A to AA");
      else if (!VOWELS.has(last)) {
        put(w + "E", "add E at the end");
        put(w + "A", "add A at the end");
      }
    }
  });
  return out;
}

/** A light phonetic check: no triple letters, no four consonants or three vowels in a row. */
export function readable(name: string): boolean {
  for (const w of name.split(" ")) {
    if (/(.)\1\1/.test(w)) return false;
    if (/[^AEIOUY]{4}/.test(w)) return false;
    if (/[AEIOU]{3}/.test(w)) return false;
  }
  return true;
}

export interface ScoredName {
  name: string;
  edits: string[];
  score: number;
  name_number: number;
  compound?: number;
  compound_class?: CompoundClass;
  fit_total: number;
  first_name_fit: number;
  pythagorean_expression: number;
  karmic_debt: boolean;
  /** One-line reason in plain words. */
  reason: string;
  components: Record<string, number>;
}

/** Scores one spelling out of 100 with the weights in optimizer.json (rules spec 3.10). */
export function scoreSpelling(
  rules: ResolvedRules,
  name: string,
  edits: string[],
  mulank: number,
  bhagyank: number,
): ScoredName {
  const w = rules.data.optimizer.weights;
  const credit = rules.data.optimizer.compound_class_credit;
  const ch = chaldeanNumber(rules, name);
  const digit = ch.number.reduced;
  const fit = nameFit(rules, digit, mulank, bhagyank, ch.compound);
  const first = chaldeanNumber(rules, normaliseName(name).parts[0]!);
  const firstFit = pairScore(rules.data.planets, rules.settings, first.number.reduced, mulank).score;
  const py = reduce(scoreName(rules.data.letters, "pythagorean", name, rules.settings["letters.y_vowel"]).total);
  const pyOk = pairScore(rules.data.planets, rules.settings, py.reduced, bhagyank).score >= 0;
  const debt = karmicDebtIn([ch.total, ...ch.number.chain]).length > 0;
  const cls = ch.compound?.class;
  const maxEdits = rules.settings["optimizer.max_edits"];

  const components = {
    name_pair_score: ((fit.total + 4) / 8) * w.name_pair_score,
    compound_class: (cls ? credit[cls] : credit.mixed) * w.compound_class,
    first_name_fit: ((firstFit + 2) / 4) * w.first_name_fit,
    pythagorean_not_opposed: pyOk ? w.pythagorean_not_opposed : 0,
    no_karmic_debt_compound: debt ? 0 : w.no_karmic_debt_compound,
    readability_closeness: (1 - edits.length / (maxEdits + 1)) * w.readability_closeness,
  };
  const score = Math.round(Object.values(components).reduce((s, x) => s + x, 0) * 10) / 10;

  const bits = [
    `${ch.total} → ${digit}`,
    `fit ${fit.total >= 0 ? "+" : ""}${fit.total} with Mulank and Bhagyank`,
    ...(cls ? [`compound ${ch.compound!.value} ${cls}`] : []),
    ...(debt ? ["karmic debt compound"] : []),
    ...(edits.length ? [edits.join(", ")] : ["current spelling"]),
  ];
  return {
    name,
    edits,
    score,
    name_number: digit,
    ...(ch.compound ? { compound: ch.compound.value } : {}),
    ...(cls ? { compound_class: cls } : {}),
    fit_total: fit.total,
    first_name_fit: firstFit,
    pythagorean_expression: py.reduced,
    karmic_debt: debt,
    reason: bits.join("; "),
    components,
  };
}

export interface NameSuggestions {
  current: ScoredName;
  suggestions: ScoredName[];
  /** Where to use each form. */
  forms: { signature: string; business_card: string; social_profile: string };
  candidates_checked: number;
  rule_refs: string[];
}

/**
 * Ranked spellings for a name (rules spec 3.10; phase 1 spec 4.1 suggestNames).
 * Variants that do not beat the current spelling are still listed if fewer than
 * `topN` beat it, so the reader sees the best available.
 */
export function suggestNames(
  rules: ResolvedRules,
  name: string,
  mulank: number,
  bhagyank: number,
  topN = rules.data.optimizer.top_n,
): NameSuggestions {
  const current = scoreSpelling(rules, normaliseName(name).text, [], mulank, bhagyank);
  const variants = generateVariants(
    name,
    rules.settings["optimizer.max_edits"],
    rules.settings["optimizer.lock_first_letter"],
    rules.data.optimizer.max_candidates,
  );
  const scored = variants
    .map((v) => scoreSpelling(rules, v.name, v.edits, mulank, bhagyank))
    .sort((a, b) => b.score - a.score || a.edits.length - b.edits.length || (a.name < b.name ? -1 : 1));
  const suggestions = scored.slice(0, topN);
  const best = suggestions[0] && suggestions[0].score > current.score ? suggestions[0] : current;
  const parts = normaliseName(best.name).parts;
  return {
    current,
    suggestions,
    forms: {
      // Full spelling for the signature; first name and surname on a card; first name alone online.
      signature: best.name,
      business_card: parts.length > 2 ? `${parts[0]} ${parts.at(-1)}` : best.name,
      social_profile: parts[0]!,
    },
    candidates_checked: variants.length,
    rule_refs: ["D15", "D8"],
  };
}
