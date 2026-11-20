import type { ResolvedRules } from "../rules/loader.js";
import type { Person } from "../schemas/person.js";
import { localDateOf, parseUtcInstant, compareDates, formatDate } from "../core/dates.js";
import { digitSum, reduce, formatChain } from "../core/reduce.js";
import type { BirthMoment } from "./birth.js";

export type Direction = "N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW";
export type DirectionKind =
  | "success"
  | "health"
  | "relationships"
  | "growth"
  | "mishaps"
  | "five_ghosts"
  | "six_killings"
  | "total_loss";

export interface KuaResult {
  value: number;
  group: "east" | "west";
  basis: "male" | "female";
  /** The year whose digits were used, after the cutoff (D12). */
  solar_year: number;
  directions: Record<DirectionKind, Direction>;
  good: DirectionKind[];
  avoid: DirectionKind[];
  trace: string[];
  rule_refs: string[];
  text_keys: string[];
  /** Set when the birth is too close to Lichun to be sure which year applies. */
  uncertain?: string;
}

/**
 * Kua number (rules spec 3.8). Returns null when there is no Kua basis
 * (gender "unspecified" without kua_basis).
 */
export function kua(rules: ResolvedRules, person: Person, birth: BirthMoment): KuaResult | null {
  const basis = person.gender === "unspecified" ? person.kua_basis : person.gender;
  if (!basis) return null;

  const data = rules.data.kua;
  const { date } = birth;
  const trace: string[] = [];
  let solarYear = date.year;
  let uncertain: string | undefined;
  const cutoff = rules.settings["kua.year_cutoff"];

  if (cutoff === "fixed_feb_4") {
    const { month, day } = data.fixed_cutoff;
    if (date.month < month || (date.month === month && date.day < day)) solarYear -= 1;
    trace.push(`Year cutoff ${day} ${month === 2 ? "February" : month}: solar year ${solarYear}`);
  } else if (cutoff === "lichun") {
    const iso = data.lichun.utc[String(date.year)];
    if (!iso) {
      trace.push(`No Lichun entry for ${date.year}; 4 February used.`);
      if (date.month < 2 || (date.month === 2 && date.day < 4)) solarYear -= 1;
    } else {
      const lichun = parseUtcInstant(iso);
      const lichunLocal = localDateOf(lichun, birth.offsetMinutes);
      const cmp = compareDates(date, lichunLocal);
      if (cmp < 0) solarYear -= 1;
      else if (cmp === 0) {
        if (birth.utcMinutes === undefined) {
          uncertain = `Born on the Lichun day (${formatDate(lichunLocal)}) with no birth time; the new solar year is assumed.`;
        } else {
          if (birth.utcMinutes < lichun) solarYear -= 1;
          if (Math.abs(birth.utcMinutes - lichun) <= data.lichun.precision_minutes) {
            uncertain = `Born within ${data.lichun.precision_minutes} minutes of Lichun; the year could be either.`;
          }
        }
      }
      trace.push(`Lichun ${date.year}: ${iso} (local date ${formatDate(lichunLocal)}); solar year ${solarYear}`);
    }
  } else {
    trace.push(`Year cutoff 1 January: solar year ${solarYear}`);
  }

  const s = reduce(digitSum(solarYear));
  trace.push(`s = digit sum of ${solarYear}: ${formatChain(s.chain)}`);
  let raw: number;
  if (basis === "male") {
    raw = reduce(data.formula.male.base - s.value).value;
    trace.push(`Male: ${data.formula.male.base} − ${s.value} = ${data.formula.male.base - s.value} → ${raw}`);
  } else {
    raw = reduce(data.formula.female.base + s.value).value;
    trace.push(`Female: ${data.formula.female.base} + ${s.value} = ${data.formula.female.base + s.value} → ${raw}`);
  }
  let value = raw;
  if (raw === 5) {
    value = data.formula.kua5[basis];
    trace.push(`Kua 5 becomes ${value} for ${basis === "male" ? "males" : "females"}`);
  }
  const group = data.groups.east.includes(value) ? "east" : "west";
  const directions = data.directions[String(value)] as Record<DirectionKind, Direction>;
  const out: KuaResult = {
    value,
    group,
    basis,
    solar_year: solarYear,
    directions,
    good: data.direction_kinds.good as DirectionKind[],
    avoid: data.direction_kinds.avoid as DirectionKind[],
    trace,
    rule_refs: ["D12"],
    text_keys: [`kua.${value}`, `kua.group.${group}`],
  };
  if (uncertain) out.uncertain = uncertain;
  return out;
}
