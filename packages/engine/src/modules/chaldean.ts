import type { ResolvedRules } from "../rules/loader.js";
import type { NumberResult } from "../schemas/common.js";
import { reduce, toCompound, formatChain } from "../core/reduce.js";
import { keepMasters } from "../core/masters.js";
import { karmicDebtIn, numberKey, withExtras } from "../core/result.js";
import { pairScore, planetOf, type PairScore } from "../core/planets.js";
import { scoreName, type NameScore } from "../core/letters.js";

export type CompoundClass = "favourable" | "mixed" | "unfavourable";

export interface CompoundInfo {
  value: number;
  name: string;
  /** The compound whose reading this one shares, when it is "read like" an earlier one. */
  read_like?: number;
  /** Absent when compound classification is switched off (D8). */
  class?: CompoundClass;
  text_key: string;
}

export interface NameNumber {
  total: number;
  number: NumberResult & { planet: string };
  compound?: CompoundInfo;
  letters: NameScore["parts"];
}

export interface NameFit {
  mulank: number;
  bhagyank: number;
  total: number;
  label: "supported" | "mixed" | "opposed";
  pairs: { mulank: PairScore; bhagyank: PairScore };
}

export interface ChaldeanName {
  kind: "daily_use" | "birth_certificate";
  name: string;
  normalised: string;
  name_number: NameNumber;
  parts: {
    first: NameNumber;
    surname?: NameNumber;
    initials?: NameNumber & { form: string };
  };
  fit: NameFit;
}

/** Looks up a compound 10 to 52 with its name, read-like target and class (rules spec 3.5, D8). */
export function compoundInfo(rules: ResolvedRules, compound: number): CompoundInfo | undefined {
  if (compound < 10) return undefined;
  const table = rules.data.compounds.compounds;
  const entry = table[String(compound)];
  if (!entry) return undefined;
  const ownKey = "read_like" in entry ? entry.read_like : compound;
  const own = table[String(ownKey)];
  if (!own || !("name" in own)) return undefined;
  const info: CompoundInfo = {
    value: compound,
    name: own.name,
    text_key: `compound.${ownKey}`,
  };
  if ("read_like" in entry) info.read_like = entry.read_like;
  if (rules.settings["compounds.classification"] !== "none") info.class = own.class;
  return info;
}

/** Scores one name in Chaldean: total, compound, reduced number with planet and working. */
export function chaldeanNumber(rules: ResolvedRules, raw: string): NameNumber {
  const score = scoreName(rules.data.letters, "chaldean", raw, rules.settings["letters.y_vowel"]);
  return nameNumberFromScore(rules, score);
}

function nameNumberFromScore(rules: ResolvedRules, score: NameScore): NameNumber {
  const { compound, chain: compoundChain } = toCompound(score.total, rules.data.compounds.max_compound);
  const r = reduce(score.total, { keepMasters: keepMasters(rules.settings, "vedic") });
  const info = compoundInfo(rules, compound);
  const debt = karmicDebtIn(r.chain);
  const trace = [...score.trace];
  if (compoundChain.length > 1) trace.push(`Above ${rules.data.compounds.max_compound}, so the compound is ${formatChain(compoundChain)}`);
  trace.push(`Name number: ${formatChain(r.chain)}`);
  const number = {
    ...withExtras(r, {
      ...(info ? { compound: info.value } : {}),
      trace,
      rule_refs: ["D3", "D8"],
      text_keys: [numberKey("name_number", r), ...(info ? [info.text_key] : []), ...debt.map((n) => `karmic_debt.${n}`)],
      flags: [
        ...(info?.class === "unfavourable" ? (["unfavourable_compound"] as const) : []),
        ...(debt.length ? (["karmic_debt"] as const) : []),
      ],
    }),
    planet: planetOf(rules.data.planets, r.reduced),
  };
  return { total: score.total, number, ...(info ? { compound: info } : {}), letters: score.parts };
}

/** Name fit: pair score with the Mulank plus pair score with the Bhagyank, −4 to +4 (rules spec 3.5). */
export function nameFit(rules: ResolvedRules, nameDigit: number, mulank: number, bhagyank: number, compound?: CompoundInfo): NameFit {
  const p = rules.data.planets;
  const m = pairScore(p, rules.settings, nameDigit, mulank);
  const b = pairScore(p, rules.settings, nameDigit, bhagyank);
  const total = m.score + b.score;
  const supported = m.score >= 0 && b.score >= 0 && compound?.class !== "unfavourable";
  return {
    mulank: m.score,
    bhagyank: b.score,
    total,
    label: supported ? "supported" : total < 0 ? "opposed" : "mixed",
    pairs: { mulank: m, bhagyank: b },
  };
}

/** Full Chaldean analysis of one name: number, parts (first name, surname, initials form) and fit. */
export function chaldeanName(
  rules: ResolvedRules,
  kind: ChaldeanName["kind"],
  raw: string,
  mulank: number,
  bhagyank: number,
): ChaldeanName {
  const score = scoreName(rules.data.letters, "chaldean", raw, rules.settings["letters.y_vowel"]);
  const name_number = nameNumberFromScore(rules, score);
  const parts = score.name.parts;
  const first = chaldeanNumber(rules, parts[0]!);
  const out: ChaldeanName = {
    kind,
    name: raw,
    normalised: score.name.text,
    name_number,
    parts: { first },
    fit: nameFit(rules, name_number.number.reduced, mulank, bhagyank, name_number.compound),
  };
  if (parts.length > 1) {
    out.parts.surname = chaldeanNumber(rules, parts.at(-1)!);
    const form = [...parts.slice(0, -1).map((p) => p[0]!), parts.at(-1)!].join(" ");
    out.parts.initials = { ...chaldeanNumber(rules, form), form };
  }
  return out;
}
