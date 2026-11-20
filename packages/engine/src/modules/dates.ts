import type { ResolvedRules } from "../rules/loader.js";
import type { ClassicalPlanet } from "../schemas/common.js";
import type { ProfileResult } from "../schemas/profile.js";
import { EngineError } from "../errors.js";
import { addDays, formatDate, parseDate, toDayNumber, weekday } from "../core/dates.js";
import { digitSum, reduce } from "../core/reduce.js";
import { effectivePlanet, pairScore, planetOf } from "../core/planets.js";

const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;
const WEEKDAY_PLANET: ClassicalPlanet[] = ["sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn"];

export interface DateRequest {
  from: string;
  to: string;
  purpose: string;
  top_n?: number;
}

export interface DateCandidate {
  date: string;
  weekday: string;
  universal_day: number;
  people: { name: string; personal_day: number; points: number; reasons: string[] }[];
  score: number;
}

export interface DateResult {
  purpose: string;
  purpose_days: number[];
  from: string;
  to: string;
  dates: DateCandidate[];
  checked: number;
  rule_refs: string[];
}

/**
 * Favourable dates in a range for a launch, signing or move (rules spec 2,
 * date selector; phase 1 spec 4.1 findDates). Each date is scored for every
 * person by personal day, universal day and lucky numbers, then summed.
 */
export function findDates(request: DateRequest, people: ProfileResult[], rules: ResolvedRules): DateResult {
  const data = rules.data.dates;
  const purposes = data.purposes as Record<string, number[]>;
  const purposeDays = purposes[request.purpose];
  if (!purposeDays) {
    throw new EngineError("invalid_input", `Unknown purpose "${request.purpose}" (have: ${Object.keys(purposes).join(", ")}).`, "purpose");
  }
  if (people.length === 0) throw new EngineError("invalid_input", "Give at least one person.", "profiles");
  const from = parseDate(request.from, "from");
  const to = parseDate(request.to, "to");
  const days = toDayNumber(to) - toDayNumber(from) + 1;
  if (days < 1) throw new EngineError("invalid_input", "The range ends before it starts.", "to");
  if (days > data.max_range_days) {
    throw new EngineError("invalid_input", `The range can be at most ${data.max_range_days} days.`, "to");
  }

  const w = data.weights;
  const pd = rules.data.planets;
  const candidates: DateCandidate[] = [];
  for (let i = 0; i < days; i++) {
    const d = addDays(from, i);
    const iso = formatDate(d);
    const ud = reduce(digitSum(Number(iso.replace(/-/g, "")))).reduced;
    const wd = weekday(d);
    const dayPlanet = WEEKDAY_PLANET[wd]!;
    const scored = people.map((p) => {
      const birth = parseDate(p.person.working_date);
      const py = reduce(digitSum(birth.day) + digitSum(birth.month) + digitSum(d.year)).reduced;
      const pm = reduce(py + d.month).reduced;
      const pday = reduce(pm + d.day).reduced;
      const mulank = p.date_numbers.mulank.reduced;
      const lucky = p.lucky.numbers;
      const reasons: string[] = [];
      let points = 0;
      if (purposeDays.includes(pday)) {
        points += w.purpose_personal_day;
        reasons.push(`personal day ${pday} suits a ${request.purpose}`);
      }
      const withMulank = pairScore(pd, rules.settings, pday, mulank).score;
      points += withMulank * w.personal_day_with_mulank;
      if (withMulank !== 0) reasons.push(`personal day ${pday} with Mulank ${mulank}: ${withMulank > 0 ? "+" : ""}${withMulank}`);
      if (lucky.includes(ud)) {
        points += w.universal_day_lucky;
        reasons.push(`universal day ${ud} is a lucky number`);
      }
      if (lucky.includes(reduce(d.day).reduced)) {
        points += w.date_day_lucky;
        reasons.push(`date ${d.day} reduces to a lucky number`);
      }
      const mPlanet = effectivePlanet(rules.settings, planetOf(pd, mulank));
      if (pd.friendship[mPlanet]?.enemies.includes(dayPlanet)) {
        points -= w.avoid_weekday_of_enemy;
        reasons.push(`${WEEKDAYS[wd]} is ruled by ${dayPlanet}, an enemy of the Mulank's planet`);
      }
      return { name: p.person.name, personal_day: pday, points, reasons };
    });
    candidates.push({
      date: iso,
      weekday: WEEKDAYS[wd]!,
      universal_day: ud,
      people: scored,
      score: scored.reduce((s, x) => s + x.points, 0),
    });
  }
  const ranked = [...candidates].sort((a, b) => b.score - a.score || (a.date < b.date ? -1 : 1));
  return {
    purpose: request.purpose,
    purpose_days: purposeDays,
    from: request.from,
    to: request.to,
    dates: ranked.slice(0, request.top_n ?? data.top_n),
    checked: days,
    rule_refs: ["D13"],
  };
}
