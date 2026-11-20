import type { ResolvedRules } from "../rules/loader.js";
import { pairScore, type PairScore } from "../core/planets.js";

export interface DriverConductor {
  driver: number;
  conductor: number;
  pair: PairScore;
  /** Present when the pair is on the special-pairs list (D7). */
  special?: string;
  text_keys: string[];
  rule_refs: string[];
}

/** Driver (Mulank) and Conductor (Bhagyank) together (rules spec 3.4). */
export function driverConductor(rules: ResolvedRules, mulank: number, bhagyank: number): DriverConductor {
  const pair = pairScore(rules.data.planets, rules.settings, mulank, bhagyank);
  const id = `${mulank}-${bhagyank}`;
  const reverse = `${bhagyank}-${mulank}`;
  const list = rules.settings["driver_conductor.special_pairs"];
  const special = list.includes(id) ? id : list.includes(reverse) ? reverse : undefined;
  const out: DriverConductor = {
    driver: mulank,
    conductor: bhagyank,
    pair,
    text_keys: [`driver_conductor.${id}`, `driver_conductor.tone.${pair.label}`, ...(special ? [`driver_conductor.special.${special}`] : [])],
    rule_refs: ["D6", "D7"],
  };
  if (special) out.special = special;
  return out;
}
