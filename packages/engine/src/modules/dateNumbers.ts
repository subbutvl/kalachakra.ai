import type { ResolvedRules } from "../rules/loader.js";
import type { NumberResult, Planet } from "../schemas/common.js";
import type { CalendarDate } from "../core/dates.js";
import { digitSum, formatChain, reduce } from "../core/reduce.js";
import { keepMasters } from "../core/masters.js";
import { karmicDebtIn, numberKey, sumTrace, withExtras } from "../core/result.js";
import { planetOf } from "../core/planets.js";

export interface DateNumbers {
  mulank: NumberResult & { planet: Planet };
  bhagyank: NumberResult & { planet: Planet };
  birthday: { value: number; text_keys: string[] };
  /** Karmic debt numbers found on the day or the Bhagyank sum (name totals are checked in their modules). */
  karmic_debt: number[];
  master_day: boolean;
}

function digitsOf(d: CalendarDate): number[] {
  // Day as written, month as two digits, year as four (as the benchmark writes 9+0+3+2+0+1+6).
  const s = `${d.day}${String(d.month).padStart(2, "0")}${String(d.year).padStart(4, "0")}`;
  return [...s].map(Number);
}

/** Mulank, Bhagyank, karmic debt and birthday number (rules spec 3.3). */
export function dateNumbers(date: CalendarDate, rules: ResolvedRules): DateNumbers {
  const keep = keepMasters(rules.settings, "vedic");
  const planets = rules.data.planets;

  // Mulank: reduce(day). Days 11 and 22 are master days.
  const m = reduce(date.day, { keepMasters: keep });
  const mDebt = karmicDebtIn(m.chain);
  const mulank = {
    ...withExtras(m, {
      trace: [`Day of birth: ${formatChain(m.chain)}`],
      rule_refs: ["D3"],
      text_keys: [numberKey("mulank", m), ...mDebt.map((n) => `karmic_debt.${n}`)],
      flags: mDebt.length ? ["karmic_debt"] : [],
    }),
    planet: planetOf(planets, m.reduced),
  };

  // Bhagyank: all digits of DD MM YYYY at once (D5 all_digits), or day, month, year reduced first.
  let b: NumberResult;
  let trace: string;
  if (rules.settings["bhagyank.sum_method"] === "all_digits") {
    const digits = digitsOf(date);
    b = reduce(digits.reduce((s, x) => s + x, 0), { keepMasters: keep });
    trace = sumTrace(digits, b);
  } else {
    const parts = [reduce(date.day).reduced, reduce(date.month).reduced, reduce(digitSum(date.year)).reduced];
    b = reduce(parts.reduce((s, x) => s + x, 0), { keepMasters: keep });
    trace = `Day, month and year reduced first: ${sumTrace(parts, b)}`;
  }
  const bDebt = karmicDebtIn(b.chain);
  const bhagyank = {
    ...withExtras(b, {
      trace: [trace],
      rule_refs: ["D3", "D5"],
      text_keys: [
        numberKey("bhagyank", b),
        ...(b.master !== undefined ? [`master.${b.master}`] : []),
        ...bDebt.map((n) => `karmic_debt.${n}`),
      ],
      flags: bDebt.length ? ["karmic_debt"] : [],
    }),
    planet: planetOf(planets, b.reduced),
  };

  return {
    mulank,
    bhagyank,
    birthday: { value: date.day, text_keys: [`birthday.${date.day}`] },
    karmic_debt: [...new Set([...mDebt, ...bDebt])],
    master_day: date.day === 11 || date.day === 22,
  };
}

export { digitsOf };
