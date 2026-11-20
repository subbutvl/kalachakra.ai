import type { ResolvedRules } from "../rules/loader.js";
import type { NumberResult } from "../schemas/common.js";
import type { ProfileResult } from "../schemas/profile.js";
import { EngineError } from "../errors.js";
import { letterValue } from "../core/letters.js";
import { formatChain, reduce } from "../core/reduce.js";
import { withExtras } from "../core/result.js";
import { pairScore } from "../core/planets.js";

type Direction = "N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW";

export interface HouseNumber {
  input: string;
  number: NumberResult;
  residents: { name: string; mulank: number; bhagyank: number; total: number }[];
}

export interface HouseResult {
  /** Flat first, then building (rules spec 3.11). */
  numbers: HouseNumber[];
  door?: {
    direction: Direction;
    residents: { name: string; kua: number | null; kind: string | null; good: boolean | null }[];
  };
  rule_refs: string[];
  text_keys: string[];
}

export interface HouseRequest {
  flat?: string;
  building?: string;
  door?: Direction;
}

function houseNumber(rules: ResolvedRules, raw: string, field: string): NumberResult {
  const s = raw.toUpperCase().replace(/[\s\-/]/g, "");
  if (!/^\d+[A-Z]{0,2}$/.test(s)) {
    throw new EngineError("invalid_input", `${raw} is not a house or flat number like 12 or 12B.`, field);
  }
  const digits = [...s].filter((c) => /\d/.test(c)).map(Number);
  const letters = [...s].filter((c) => /[A-Z]/.test(c));
  const lv = letters.map((l) => letterValue(rules.data.letters, "chaldean", l));
  const total = digits.reduce((a, b) => a + b, 0) + lv.reduce((a, b) => a + b, 0);
  const r = reduce(total);
  const terms = [...digits.map(String), ...letters.map((l, i) => `${l}=${lv[i]}`)];
  return withExtras(r, { trace: [`${terms.join(" + ")} = ${formatChain(r.chain)}`], text_keys: [`house.number.${r.value}`] });
}

/** House or flat number and main door (rules spec 3.11; phase 1 spec 4.1 computeHouse). */
export function computeHouse(request: HouseRequest, residents: ProfileResult[], rules: ResolvedRules): HouseResult {
  if (!request.flat && !request.building) {
    throw new EngineError("invalid_input", "Give a flat number, a building number, or both.", "flat");
  }
  if (residents.length === 0) throw new EngineError("invalid_input", "Give at least one resident.", "residents");
  const p = rules.data.planets;
  const numbers: HouseNumber[] = [];
  for (const [key, raw] of [["flat", request.flat], ["building", request.building]] as const) {
    if (!raw) continue;
    const number = houseNumber(rules, raw, key);
    numbers.push({
      input: raw,
      number,
      residents: residents.map((r) => {
        const mulank = pairScore(p, rules.settings, number.reduced, r.date_numbers.mulank.reduced).score;
        const bhagyank = pairScore(p, rules.settings, number.reduced, r.date_numbers.bhagyank.reduced).score;
        return { name: r.person.name, mulank, bhagyank, total: mulank + bhagyank };
      }),
    });
  }
  const out: HouseResult = { numbers, rule_refs: [], text_keys: numbers.map((n) => `house.number.${n.number.value}`) };
  if (request.door) {
    const door = request.door;
    out.door = {
      direction: door,
      residents: residents.map((r) => {
        if (!r.kua) return { name: r.person.name, kua: null, kind: null, good: null };
        const kind = (Object.entries(r.kua.directions).find(([, d]) => d === door)?.[0] ?? null) as string | null;
        return { name: r.person.name, kua: r.kua.value, kind, good: kind ? r.kua.good.includes(kind) : null };
      }),
    };
    out.rule_refs.push("D12");
  }
  return out;
}
