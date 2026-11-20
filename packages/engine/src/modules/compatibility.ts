import type { ResolvedRules } from "../rules/loader.js";
import type { ProfileResult } from "../schemas/profile.js";
import { EngineError } from "../errors.js";
import { pairScore } from "../core/planets.js";

export type Relationship = "couple" | "business_partners" | "parent_child";
type Weights = Record<
  "driver_harmony" | "conductor_harmony" | "cross_harmony" | "loshu_gap_filling" | "life_path_synergy" | "name_harmony" | "kua_group",
  number
>;

export interface Component {
  id: keyof Weights;
  weight: number;
  /** 0 to 1: the share of the weight earned. */
  share: number;
  points: number;
  detail: string;
}

export interface CompatibilityResult {
  relationship: Relationship;
  a: string;
  b: string;
  score: number;
  band: "excellent" | "good" | "workable" | "needs_effort";
  components: Component[];
  combined_loshu: { cells: Record<string, { a: number; b: number; total: number }>; shared_gaps: number[]; a_fills_b: number[]; b_fills_a: number[] };
  life_path: { a: number; b: number; kind: "natural" | "compatible" | "challenging" };
  timeline: { year: number; a: number; b: number; pair_score: number; joint_step: boolean }[];
  rule_refs: string[];
  text_keys: string[];
}

/** Life path pair kind from the symmetric table in compatibility.json. */
export function lifePathKind(rules: ResolvedRules, a: number, b: number): "natural" | "compatible" | "challenging" {
  const t = rules.data.compatibility.life_path_pairs;
  if (t.natural_groups.some((g) => g.includes(a) && g.includes(b))) return "natural";
  if (t.compatible.some(([x, y]) => (x === a && y === b) || (x === b && y === a))) return "compatible";
  return "challenging";
}

/**
 * Compatibility of two people (rules spec 3.12, D18): a score out of 100 with
 * every component shown. Each pair score of −2 to +2 earns 0 to 100% of its weight.
 */
export function computeCompatibility(
  a: ProfileResult,
  b: ProfileResult,
  relationship: Relationship,
  rules: ResolvedRules,
): CompatibilityResult {
  const data = rules.data.compatibility;
  if (!data.relationship_types.includes(relationship)) {
    throw new EngineError("invalid_input", `Unknown relationship type "${relationship}".`, "relationship");
  }
  const setting = rules.settings["compatibility.weights"];
  const w: Weights = setting === "default" ? data.weights : setting;
  const totalWeight = Object.values(w).reduce((s, x) => s + x, 0);
  const p = rules.data.planets;
  const ps = (x: number, y: number) => pairScore(p, rules.settings, x, y).score;
  const share = (score: number) => (score + 2) / 4;

  const mA = a.date_numbers.mulank.reduced;
  const mB = b.date_numbers.mulank.reduced;
  const bA = a.date_numbers.bhagyank.reduced;
  const bB = b.date_numbers.bhagyank.reduced;
  const nA = a.chaldean.headline.name_number.number.reduced;
  const nB = b.chaldean.headline.name_number.number.reduced;
  const lpA = a.pythagorean.life_path.reduced;
  const lpB = b.pythagorean.life_path.reduced;

  const missA = a.loshu.missing;
  const missB = b.loshu.missing;
  const hasA = (n: number) => !missA.includes(n);
  const hasB = (n: number) => !missB.includes(n);
  const bFillsA = missA.filter(hasB);
  const aFillsB = missB.filter(hasA);
  const shareOf = (missing: number[], filled: number[]) => (missing.length ? filled.length / missing.length : 1);
  const gapShare = (shareOf(missA, bFillsA) + shareOf(missB, aFillsB)) / 2;

  const lpKind = lifePathKind(rules, lpA, lpB);
  const cross = (ps(mA, bB) + ps(mB, bA)) / 2;
  const kuaSame = a.kua && b.kua ? a.kua.group === b.kua.group : null;

  const raw: Omit<Component, "points">[] = [
    { id: "driver_harmony", weight: w.driver_harmony, share: share(ps(mA, mB)), detail: `Mulank ${mA} and ${mB}: ${ps(mA, mB)}` },
    { id: "conductor_harmony", weight: w.conductor_harmony, share: share(ps(bA, bB)), detail: `Bhagyank ${bA} and ${bB}: ${ps(bA, bB)}` },
    { id: "cross_harmony", weight: w.cross_harmony, share: share(cross), detail: `Mulank ${mA} with Bhagyank ${bB}: ${ps(mA, bB)}; Mulank ${mB} with Bhagyank ${bA}: ${ps(mB, bA)}; average ${cross}` },
    { id: "loshu_gap_filling", weight: w.loshu_gap_filling, share: gapShare, detail: `${b.person.name} fills ${bFillsA.length} of ${missA.length} gaps; ${a.person.name} fills ${aFillsB.length} of ${missB.length}` },
    { id: "life_path_synergy", weight: w.life_path_synergy, share: data.life_path_pairs.credit[lpKind], detail: `Life paths ${lpA} and ${lpB}: ${lpKind}` },
    { id: "name_harmony", weight: w.name_harmony, share: share(ps(nA, nB)), detail: `Name numbers ${nA} and ${nB}: ${ps(nA, nB)}` },
    { id: "kua_group", weight: w.kua_group, share: kuaSame ? 1 : 0, detail: kuaSame === null ? "Kua needs both people's Kua basis" : kuaSame ? `Both ${a.kua!.group} group` : `${a.kua!.group} and ${b.kua!.group} groups` },
  ];
  const components: Component[] = raw.map((c) => ({ ...c, points: Math.round(c.share * c.weight * 10) / 10 }));
  const score = totalWeight ? Math.round((components.reduce((s, c) => s + c.share * c.weight, 0) / totalWeight) * 100) : 0;
  const band = data.bands.find((x) => score >= x.min)!.label;

  const cells: CompatibilityResult["combined_loshu"]["cells"] = {};
  for (let n = 1; n <= 9; n++) {
    const ca = a.loshu.cells[String(n)]?.count ?? 0;
    const cb = b.loshu.cells[String(n)]?.count ?? 0;
    cells[String(n)] = { a: ca, b: cb, total: ca + cb };
  }

  // Both personal-year strips side by side; a year suits a big joint step when both years are friendly to each other.
  const timeline = a.timing.next_10_years.map((ya, i) => {
    const yb = b.timing.next_10_years[i]!;
    const s = ps(ya.personal_year.reduced, yb.personal_year.reduced);
    return { year: ya.year, a: ya.personal_year.value, b: yb.personal_year.value, pair_score: s, joint_step: s > 0 };
  });

  return {
    relationship,
    a: a.person.name,
    b: b.person.name,
    score,
    band,
    components,
    combined_loshu: { cells, shared_gaps: missA.filter((n) => missB.includes(n)), a_fills_b: aFillsB, b_fills_a: bFillsA },
    life_path: { a: lpA, b: lpB, kind: lpKind },
    timeline,
    rule_refs: ["D18"],
    text_keys: [`compatibility.band.${band}`, `compatibility.${relationship}.${band}`, `compatibility.life_path.${lpKind}`],
  };
}
