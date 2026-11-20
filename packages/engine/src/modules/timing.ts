import type { ResolvedRules } from "../rules/loader.js";
import type { NumberResult } from "../schemas/common.js";
import { ageOn, type CalendarDate } from "../core/dates.js";
import { digitSum, formatChain, reduce } from "../core/reduce.js";
import { keepMasters } from "../core/masters.js";
import { numberKey, sumTrace, withExtras } from "../core/result.js";
import { scoreName } from "../core/letters.js";

export interface Span {
  number: NumberResult;
  from_age: number;
  /** Exclusive; absent for the last span, which runs for life. */
  to_age?: number;
}

export interface MonthEntry {
  year: number;
  month: number;
  personal_month: NumberResult;
}

export interface YearStripEntry {
  year: number;
  age: number;
  personal_year: NumberResult;
  universal_year: number;
  pinnacle: number;
  dasha: number;
  essence: number;
}

export interface Timing {
  as_of: string;
  age: number;
  universal: { year: NumberResult; month: NumberResult; day: NumberResult };
  personal_year: NumberResult & { year: number };
  /** The personal year counted from the last birthday (D13 note). */
  birthday_year?: { from_year: number; value: number; reduced: number };
  personal_month: NumberResult & { year: number; month: number };
  personal_day: NumberResult;
  months_ahead: MonthEntry[];
  pinnacles: Span[];
  challenges: { number: NumberResult; from_age: number; to_age?: number }[];
  current_pinnacle: number;
  periods: Span[];
  transits: { part: string; letter: string; value: number }[];
  essence: NumberResult;
  dasha: {
    method: "mulank_led" | "none";
    periods: { number: number; from_age: number; to_age: number }[];
    current?: { number: number; from_age: number; to_age: number };
    sub_period?: number;
  };
  next_10_years: YearStripEntry[];
  rule_refs: string[];
}

const digitsSum = (n: number) => [...String(n)].map(Number);

/** Timing cycles (rules spec 3.9). */
export function timing(
  rules: ResolvedRules,
  birth: CalendarDate,
  birthName: string,
  mulank: number,
  lifePathDigit: number,
  asOf: CalendarDate,
  asOfIso: string,
): Timing {
  const keepPy = keepMasters(rules.settings, "personal_year");
  const keepPyth = keepMasters(rules.settings, "pythagorean");
  const rp = (n: number) => reduce(n, { keepMasters: keepPy });
  const rpy = (n: number) => reduce(n, { keepMasters: keepPyth });

  // Universal year, month, day.
  const uy = rp(digitSum(asOf.year));
  const um = rp(uy.reduced + asOf.month);
  const ud = rp(um.reduced + asOf.day);

  // Personal year on the calendar year (D13), with the birthday-to-birthday year beside it.
  const personalYearOf = (year: number): NumberResult => {
    const terms = [...digitsSum(birth.day), ...digitsSum(birth.month), ...digitsSum(year)];
    const r = rp(terms.reduce((s, x) => s + x, 0));
    return withExtras(r, {
      trace: [sumTrace(terms, r)],
      rule_refs: ["D3", "D13"],
      text_keys: [numberKey("personal_year", r)],
    });
  };
  const py = personalYearOf(asOf.year);
  const beforeBirthday =
    asOf.month < birth.month || (asOf.month === birth.month && asOf.day < birth.day);
  const personalMonthOf = (year: number, month: number): NumberResult => {
    const base = personalYearOf(year);
    const r = rp(base.reduced + month);
    return withExtras(r, {
      trace: [`Personal year ${base.reduced} + month ${month} = ${formatChain(r.chain)}`],
      text_keys: [numberKey("personal_month", r)],
    });
  };
  const pm = personalMonthOf(asOf.year, asOf.month);
  const pdR = rp(pm.reduced + asOf.day);
  const pd = withExtras(pdR, {
    trace: [`Personal month ${pm.reduced} + day ${asOf.day} = ${formatChain(pdR.chain)}`],
    text_keys: [numberKey("personal_day", pdR)],
  });

  const months_ahead: MonthEntry[] = [];
  for (let i = 0; i < 12; i++) {
    const m0 = asOf.month - 1 + i;
    const year = asOf.year + Math.floor(m0 / 12);
    const month = (m0 % 12) + 1;
    months_ahead.push({ year, month, personal_month: personalMonthOf(year, month) });
  }

  // Pinnacles and challenges from month, day and year reduced separately.
  const M = rpy(birth.month);
  const D = rpy(birth.day);
  const Y = rpy(digitSum(birth.year));
  const p1 = rpy(M.reduced + D.reduced);
  const p2 = rpy(D.reduced + Y.reduced);
  const p3 = rpy(p1.reduced + p2.reduced);
  const p4 = rpy(M.reduced + Y.reduced);
  const end1 = 36 - lifePathDigit;
  const ends = [end1, end1 + 9, end1 + 18];
  const pinTrace = [
    `Month ${formatChain(M.chain)}, day ${formatChain(D.chain)}, year ${birth.year} → ${formatChain(Y.chain)}`,
    `P1 = ${M.reduced} + ${D.reduced} = ${formatChain(p1.chain)}; P2 = ${D.reduced} + ${Y.reduced} = ${formatChain(p2.chain)}; P3 = ${p1.reduced} + ${p2.reduced} = ${formatChain(p3.chain)}; P4 = ${M.reduced} + ${Y.reduced} = ${formatChain(p4.chain)}`,
    `P1 ends at 36 − life path ${lifePathDigit} = ${end1}`,
  ];
  const pin = (r: NumberResult, i: number) =>
    withExtras(r, { trace: i === 0 ? pinTrace : [], text_keys: [numberKey("pinnacle", r)], rule_refs: ["D3"] });
  const pinnacles: Span[] = [
    { number: pin(p1, 0), from_age: 0, to_age: ends[0]! },
    { number: pin(p2, 1), from_age: ends[0]!, to_age: ends[1]! },
    { number: pin(p3, 2), from_age: ends[1]!, to_age: ends[2]! },
    { number: pin(p4, 3), from_age: ends[2]! },
  ];
  const c1 = Math.abs(M.reduced - D.reduced);
  const c2 = Math.abs(D.reduced - Y.reduced);
  const c3 = Math.abs(c1 - c2);
  const c4 = Math.abs(M.reduced - Y.reduced);
  const ch = (v: number) => withExtras(reduce(v), { text_keys: [`challenge.${v}`] });
  const challenges = [
    { number: { ...ch(c1), trace: [`C1 = |${M.reduced} − ${D.reduced}| = ${c1}; C2 = |${D.reduced} − ${Y.reduced}| = ${c2}; C3 = |${c1} − ${c2}| = ${c3}; C4 = |${M.reduced} − ${Y.reduced}| = ${c4}`] }, from_age: 0, to_age: ends[0]! },
    { number: ch(c2), from_age: ends[0]!, to_age: ends[1]! },
    { number: ch(c3), from_age: ends[1]!, to_age: ends[2]! },
    { number: ch(c4), from_age: ends[2]! },
  ];

  const age = ageOn(birth, asOf);
  const spanAt = <T extends { from_age: number; to_age?: number }>(spans: T[], a: number): T =>
    spans.find((s) => a >= s.from_age && (s.to_age === undefined || a < s.to_age)) ?? spans.at(-1)!;

  // Period cycles: month, day, year, changing when P1 and P3 end.
  const periods: Span[] = [
    { number: withExtras(M, { text_keys: [numberKey("period", M)] }), from_age: 0, to_age: ends[0]! },
    { number: withExtras(D, { text_keys: [numberKey("period", D)] }), from_age: ends[0]!, to_age: ends[2]! },
    { number: withExtras(Y, { text_keys: [numberKey("period", Y)] }), from_age: ends[2]! },
  ];

  // Letter transits and essence: each letter rules for years equal to its Pythagorean value.
  const nameScore = scoreName(rules.data.letters, "pythagorean", birthName, rules.settings["letters.y_vowel"]);
  const transitAt = (a: number) =>
    nameScore.parts.map((p) => {
      const cycle = p.letters.reduce((s, l) => s + l.value, 0);
      let t = a % cycle;
      for (const l of p.letters) {
        if (t < l.value) return { part: p.part, letter: l.letter, value: l.value };
        t -= l.value;
      }
      return { part: p.part, letter: p.letters[0]!.letter, value: p.letters[0]!.value };
    });
  const transits = transitAt(age);
  const essR = rpy(transits.reduce((s, t) => s + t.value, 0));
  const essence = withExtras(essR, {
    trace: [`Active letters at age ${age}: ${transits.map((t) => `${t.letter}=${t.value}`).join(" + ")} = ${formatChain(essR.chain)}`],
    text_keys: [numberKey("essence", essR)],
  });

  // Numerology dasha (D14): Mulank-led periods, each number ruling for its own value in years.
  const dashaPeriods: Timing["dasha"]["periods"] = [];
  if (rules.settings["dasha.method"] === "mulank_led") {
    let n = mulank;
    let from = 0;
    while (from < 108) {
      dashaPeriods.push({ number: n, from_age: from, to_age: from + n });
      from += n;
      n = (n % 9) + 1;
    }
  }
  const dashaAt = (a: number) => dashaPeriods.find((p) => a >= p.from_age && a < p.to_age);

  const next_10_years: YearStripEntry[] = [];
  for (let i = 0; i < 10; i++) {
    const year = asOf.year + i;
    const a = year - birth.year;
    next_10_years.push({
      year,
      age: a,
      personal_year: personalYearOf(year),
      universal_year: rp(digitSum(year)).value,
      pinnacle: spanAt(pinnacles, a).number.value,
      dasha: dashaAt(a)?.number ?? 0,
      essence: rpy(transitAt(a).reduce((s, t) => s + t.value, 0)).value,
    });
  }

  const out: Timing = {
    as_of: asOfIso,
    age,
    universal: {
      year: withExtras(uy, { trace: [`Digits of ${asOf.year}: ${formatChain(uy.chain)}`], text_keys: [numberKey("universal_year", uy)] }),
      month: withExtras(um, { text_keys: [numberKey("universal_month", um)] }),
      day: withExtras(ud, { text_keys: [numberKey("universal_day", ud)] }),
    },
    personal_year: { ...py, year: asOf.year },
    personal_month: { ...pm, year: asOf.year, month: asOf.month },
    personal_day: pd,
    months_ahead,
    pinnacles,
    challenges,
    current_pinnacle: spanAt(pinnacles, age).number.value,
    periods,
    transits,
    essence,
    dasha: { method: rules.settings["dasha.method"], periods: dashaPeriods },
    next_10_years,
    rule_refs: ["D3", "D13", "D14"],
  };
  if (rules.settings["personal_year.show_birthday_year"] && beforeBirthday) {
    const prev = personalYearOf(asOf.year - 1);
    out.birthday_year = { from_year: asOf.year - 1, value: prev.value, reduced: prev.reduced };
  }
  const current = dashaAt(age);
  if (current) {
    out.dasha.current = current;
    out.dasha.sub_period = py.reduced;
  }
  if (rules.settings["personal_year.start"] === "birthday" && beforeBirthday) {
    // Practitioner switch: the year runs birthday to birthday, so before the birthday last year's number applies.
    const prev = personalYearOf(asOf.year - 1);
    out.personal_year = { ...prev, year: asOf.year - 1 };
  }
  return out;
}
