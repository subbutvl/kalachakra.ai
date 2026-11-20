import type { ResolvedRules } from "../rules/loader.js";
import type { Planet } from "../schemas/common.js";
import { effectivePlanet, pairScore, planetOf } from "../core/planets.js";

export interface LuckySet {
  /** Ascending, as the report lists them. */
  numbers: number[];
  /** Best first: by pair score with the Bhagyank, then the Mulank first, then smaller number. */
  ranked: { number: number; planet: Planet; bhagyank_score: number }[];
  days: string[];
  colours: string[];
  trace: string[];
  text_keys: string[];
}

/**
 * Lucky set (rules spec 3.4): the Mulank plus the numbers of its friendly
 * planets, ranked by how they score with the Bhagyank. Days and colours
 * follow each planet, with Rahu as Saturday and Ketu as Tuesday.
 */
export function lucky(rules: ResolvedRules, mulank: number, bhagyank: number): LuckySet {
  const data = rules.data.planets;
  const mPlanet = planetOf(data, mulank);
  const friends = data.friendship[effectivePlanet(rules.settings, mPlanet)]?.friends ?? [];
  const nums = [mulank];
  for (let n = 1; n <= 9; n++) {
    if (n !== mulank && (friends as readonly string[]).includes(planetOf(data, n))) nums.push(n);
  }
  const ranked = nums
    .map((n) => ({ number: n, planet: planetOf(data, n), bhagyank_score: pairScore(data, rules.settings, n, bhagyank).score }))
    .sort((a, b) => b.bhagyank_score - a.bhagyank_score || Number(b.number === mulank) - Number(a.number === mulank) || a.number - b.number);
  const days: string[] = [];
  const colours: string[] = [];
  for (const r of ranked) {
    const day = data.days[r.planet];
    if (day && !days.includes(day)) days.push(day);
    for (const c of (data.colours[r.planet] as string[] | undefined) ?? []) if (!colours.includes(c)) colours.push(c);
  }
  return {
    numbers: [...nums].sort((a, b) => a - b),
    ranked,
    days,
    colours,
    trace: [`Mulank ${mulank} (${mPlanet}); friends ${friends.join(", ") || "none"}: ${[...nums].sort((a, b) => a - b).join(", ")}`],
    text_keys: [`lucky.planet.${mPlanet}`],
  };
}
