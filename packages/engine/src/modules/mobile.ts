import type { ResolvedRules } from "../rules/loader.js";
import type { NumberResult } from "../schemas/common.js";
import type { ProfileResult } from "../schemas/profile.js";
import { EngineError } from "../errors.js";
import { formatChain, reduce, toCompound } from "../core/reduce.js";
import { numberKey, withExtras } from "../core/result.js";
import { pairScore, planetOf, type PairScore } from "../core/planets.js";
import { compoundInfo, type CompoundInfo } from "./chaldean.js";

export type FlowKind = "smooth" | "neutral" | "clash" | "pause" | "amplifier";

export interface FlowPair {
  pair: string;
  kind: FlowKind;
  elements?: [string, string];
  /** True when the pair is on the avoid list (D21). */
  avoid: boolean;
  /** The planet pair score of the two digits, as a second view (absent for pairs with 0). */
  planet_score?: number;
}

/** The person-level numbers a number is scored against. */
export interface Owner {
  mulank: number;
  bhagyank: number;
  name_number: number;
  missing: number[];
}

export function ownerOf(profile: ProfileResult): Owner {
  return {
    mulank: profile.date_numbers.mulank.reduced,
    bhagyank: profile.date_numbers.bhagyank.reduced,
    name_number: profile.chaldean.headline.name_number.number.reduced,
    missing: profile.loshu.missing,
  };
}

export interface NumberFit {
  mulank: number;
  bhagyank: number;
  name_number: number;
  /** −6 to +6. */
  total: number;
  pairs: PairScore[];
}

/** Pair score of a final number with the owner's Mulank, Bhagyank and name number (rules spec 3.11). */
export function fitWith(rules: ResolvedRules, digit: number, owner: Owner): NumberFit {
  const p = rules.data.planets;
  const m = pairScore(p, rules.settings, digit, owner.mulank);
  const b = pairScore(p, rules.settings, digit, owner.bhagyank);
  const n = pairScore(p, rules.settings, digit, owner.name_number);
  return { mulank: m.score, bhagyank: b.score, name_number: n.score, total: m.score + b.score + n.score, pairs: [m, b, n] };
}

/** Digits opposed (negative pair score) to both the Mulank and the Bhagyank. */
export function goEasyDigits(rules: ResolvedRules, owner: Owner): number[] {
  const p = rules.data.planets;
  return [1, 2, 3, 4, 5, 6, 7, 8, 9].filter(
    (d) => pairScore(p, rules.settings, d, owner.mulank).score < 0 && pairScore(p, rules.settings, d, owner.bhagyank).score < 0,
  );
}

function elementOf(rules: ResolvedRules, d: number): string {
  return rules.data.planets.elements[planetOf(rules.data.planets, d)] as string;
}

function matrixKind(rules: ResolvedRules, a: string, b: string): "smooth" | "neutral" | "clash" {
  const has = (list: [string, string][]) => list.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
  const m = rules.data.mobile.element_matrix;
  return has(m.clash as [string, string][]) ? "clash" : has(m.smooth as [string, string][]) ? "smooth" : "neutral";
}

/** Element flow of adjacent digit pairs (rules spec 3.11, D16, D21). */
export function elementFlow(rules: ResolvedRules, digits: number[]): FlowPair[] {
  const zero = rules.settings["mobile.zero_mode"];
  const avoid = new Set(rules.settings["mobile.avoid_pairs"]);
  const seq = zero === "ignore" ? digits.filter((d) => d !== 0) : digits;
  const out: FlowPair[] = [];
  for (let i = 0; i + 1 < seq.length; i++) {
    const a = seq[i]!;
    const b = seq[i + 1]!;
    const pair = `${a}${b}`;
    const onList = avoid.has(pair) || avoid.has(`${b}${a}`);
    if (a === 0 || b === 0) {
      out.push({ pair, kind: zero === "amplifier" ? "amplifier" : "pause", avoid: onList });
      continue;
    }
    const ea = elementOf(rules, a);
    const eb = elementOf(rules, b);
    const kind = onList ? "clash" : matrixKind(rules, ea, eb);
    out.push({ pair, kind, elements: [ea, eb], avoid: onList, planet_score: pairScore(rules.data.planets, rules.settings, a, b).score });
  }
  return out;
}

export interface DigitCounts {
  repeated: Record<string, number>;
  missing: number[];
  zeros: number;
  fills_loshu_gaps: number[];
  go_easy_present: number[];
}

export interface NumberReading {
  input: string;
  digits: string;
  total: NumberResult;
  compound?: CompoundInfo;
  planet: string;
  fit: NumberFit;
  flow?: { pairs: FlowPair[]; smooth: number; neutral: number; clash: number; pause: number };
  counts: DigitCounts;
  score: { value: number; verdict: "keep" | "keep_with_notes" | "consider_second_number"; components: Record<string, number> };
  text_keys: string[];
}

/**
 * The shared reading of a digit sequence: total, compound, fit, element flow,
 * counts and a score out of 100 (rules spec 3.11). Used for mobiles, the
 * digits of vehicle registrations, and candidate numbers.
 */
export function readDigits(
  rules: ResolvedRules,
  input: string,
  digits: number[],
  owner: Owner,
  total: number = digits.reduce((s, d) => s + d, 0),
  kind = "mobile",
): NumberReading {
  const model = rules.settings["mobile.reading_model"];
  const r = reduce(total);
  const { compound } = toCompound(total, rules.data.compounds.max_compound);
  const info = compoundInfo(rules, compound);
  const fit = fitWith(rules, r.reduced, owner);
  const pairs = elementFlow(rules, digits);
  const count = (k: FlowKind) => pairs.filter((p) => p.kind === k).length;
  const flow = { pairs, smooth: count("smooth"), neutral: count("neutral"), clash: count("clash"), pause: count("pause") + count("amplifier") };

  const repeated: Record<string, number> = {};
  for (let d = 0; d <= 9; d++) {
    const c = digits.filter((x) => x === d).length;
    if (c > 1) repeated[String(d)] = c;
  }
  const present = new Set(digits);
  const goEasy = goEasyDigits(rules, owner);
  const counts: DigitCounts = {
    repeated,
    missing: [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((d) => !present.has(d)),
    zeros: digits.filter((d) => d === 0).length,
    fills_loshu_gaps: owner.missing.filter((d) => present.has(d)),
    go_easy_present: goEasy.filter((d) => present.has(d)),
  };

  // Score out of 100: fit, flow (smooth minus clash), digits to go easy on, Lo Shu gaps filled.
  const w = rules.data.mobile.score.weights;
  const readable = flow.smooth + flow.neutral + flow.clash;
  const goEasyOcc = digits.filter((d) => goEasy.includes(d)).length;
  const comp: Record<string, number> = {
    fit: ((fit.total + 6) / 12) * w.fit,
    flow: readable ? ((flow.smooth - flow.clash + readable) / (2 * readable)) * w.flow : w.flow / 2,
    go_easy_digits: Math.max(0, 1 - goEasyOcc / Math.max(1, digits.length)) * w.go_easy_digits,
    loshu_gaps_filled: owner.missing.length ? (counts.fills_loshu_gaps.length / owner.missing.length) * w.loshu_gaps_filled : w.loshu_gaps_filled,
  };
  if (model === "classic") delete comp.flow;
  if (model === "element_flow") delete comp.fit;
  const maxPossible = (model === "classic" ? w.fit + w.go_easy_digits + w.loshu_gaps_filled : model === "element_flow" ? w.flow + w.go_easy_digits + w.loshu_gaps_filled : w.fit + w.flow + w.go_easy_digits + w.loshu_gaps_filled);
  const value = Math.round((Object.values(comp).reduce((s, x) => s + x, 0) / maxPossible) * 1000) / 10;
  const verdict = rules.data.mobile.score.bands.find((b) => value >= b.min)!.verdict;

  const total_ = withExtras(r, {
    ...(info ? { compound: info.value } : {}),
    trace: [`${digits.join(" + ")} = ${formatChain(r.chain)}${info?.read_like ? ` (compound ${info.value} read like ${info.read_like})` : ""}`],
    rule_refs: ["D16", "D20", "D21"],
    text_keys: [numberKey(`${kind}.total`, r)],
  });
  const reading: NumberReading = {
    input,
    digits: digits.join(""),
    total: total_,
    planet: planetOf(rules.data.planets, r.reduced),
    fit,
    counts,
    score: { value, verdict, components: comp },
    text_keys: [numberKey(`${kind}.total`, r), `${kind}.verdict.${verdict}`, ...(info ? [info.text_key] : [])],
  };
  if (info) reading.compound = info;
  if (model !== "classic") reading.flow = flow;
  return reading;
}

/** The 10-digit national number, with +91, 0091 or a leading 0 removed (rules spec 3.11). */
export function nationalNumber(rules: ResolvedRules, raw: string, field = "numbers"): string {
  let s = raw.replace(/[\s\-().]/g, "");
  const { length, strip_prefixes } = rules.data.mobile.national_number;
  for (const p of strip_prefixes) {
    if (s.startsWith(p) && s.length - p.length === length) {
      s = s.slice(p.length);
      break;
    }
  }
  if (!new RegExp(`^\\d{${length}}$`).test(s)) {
    throw new EngineError("invalid_input", `${raw} is not a ${length}-digit Indian mobile number.`, field);
  }
  return s;
}

export interface MobileReading extends NumberReading {
  last4: { digits: string; total: NumberResult; pairs: FlowPair[] };
}

export interface MobileResult {
  readings: MobileReading[];
  /** Up to 20 numbers, best first. */
  ranked: { input: string; score: number; verdict: string }[];
  go_easy_digits: number[];
  goals: Record<string, number[]>;
  target_totals: number[];
  candidates?: { prefix: string; endings: { number: string; ending: string; total: number; score: number }[] };
  rule_refs: string[];
}

export interface MobileRequest {
  numbers: string[];
  goals?: string[];
  /** Find new endings for this number's prefix (or a 6-digit prefix). */
  find_for?: string;
  max_candidates?: number;
}

/** Target totals: the best final numbers by Mulank and Bhagyank pair score, narrowed by goals. */
export function targetTotals(rules: ResolvedRules, owner: Owner, goalDigits: number[] = []): number[] {
  const p = rules.data.planets;
  const ranked = [1, 2, 3, 4, 5, 6, 7, 8, 9]
    .map((d) => ({ d, s: pairScore(p, rules.settings, d, owner.mulank).score + pairScore(p, rules.settings, d, owner.bhagyank).score }))
    .sort((a, b) => b.s - a.s || a.d - b.d)
    .slice(0, rules.data.mobile.finder.target_totals)
    .map((x) => x.d);
  const narrowed = goalDigits.length ? ranked.filter((d) => goalDigits.includes(d)) : ranked;
  return narrowed.length ? narrowed : ranked;
}

/** Mobile numbers (rules spec 3.11; phase 1 spec 4.1 computeMobile). */
export function computeMobile(request: MobileRequest, owner: ProfileResult, rules: ResolvedRules): MobileResult {
  const o = ownerOf(owner);
  const limit = rules.data.mobile.finder.max_ranked_numbers;
  if (request.numbers.length === 0 || request.numbers.length > limit) {
    throw new EngineError("invalid_input", `Give 1 to ${limit} mobile numbers.`, "numbers");
  }
  const goEasy = goEasyDigits(rules, o);
  const goalSets = rules.data.mobile.goals as unknown as Record<string, number[]>;
  const goals: Record<string, number[]> = {};
  for (const g of request.goals ?? []) {
    const set = goalSets[g];
    if (!set || g === "$comment") throw new EngineError("invalid_input", `Unknown goal "${g}".`, "goals");
    goals[g] = set.filter((d) => !goEasy.includes(d));
  }
  const goalDigits = [...new Set(Object.values(goals).flat())];

  const readings = request.numbers.map((raw, i): MobileReading => {
    const n = nationalNumber(rules, raw, `numbers.${i}`);
    const digits = [...n].map(Number);
    const base = readDigits(rules, raw, digits, o);
    const last = digits.slice(-4);
    const lastTotal = reduce(last.reduce((s, d) => s + d, 0));
    return {
      ...base,
      last4: {
        digits: last.join(""),
        total: withExtras(lastTotal, { trace: [`${last.join(" + ")} = ${formatChain(lastTotal.chain)}`] }),
        pairs: elementFlow(rules, last),
      },
    };
  });
  const ranked = readings
    .map((r) => ({ input: r.input, score: r.score.value, verdict: r.score.verdict }))
    .sort((a, b) => b.score - a.score);

  const targets = targetTotals(rules, o, goalDigits);
  const out: MobileResult = { readings, ranked, go_easy_digits: goEasy, goals, target_totals: targets, rule_refs: ["D16", "D20", "D21"] };

  if (request.find_for) {
    const keep = rules.data.mobile.finder.keep_prefix_digits;
    const source = request.find_for.length === keep && /^\d+$/.test(request.find_for)
      ? request.find_for
      : nationalNumber(rules, request.find_for, "find_for").slice(0, keep);
    const prefix = [...source].map(Number);
    const endLen = rules.data.mobile.national_number.length - keep;
    const endings: NonNullable<MobileResult["candidates"]>["endings"] = [];
    for (let i = 0; i < 10 ** endLen; i++) {
      const ending = String(i).padStart(endLen, "0");
      const digits = [...prefix, ...[...ending].map(Number)];
      const total = reduce(digits.reduce((s, d) => s + d, 0)).reduced;
      if (!targets.includes(total)) continue;
      const flow = elementFlow(rules, digits);
      if (flow.some((p) => p.kind === "clash")) continue;
      const r = readDigits(rules, digits.join(""), digits, o);
      endings.push({ number: digits.join(""), ending, total, score: r.score.value });
    }
    endings.sort((a, b) => b.score - a.score || targets.indexOf(a.total) - targets.indexOf(b.total) || (a.ending < b.ending ? -1 : 1));
    out.candidates = { prefix: source, endings: endings.slice(0, request.max_candidates ?? 10) };
  }
  return out;
}
