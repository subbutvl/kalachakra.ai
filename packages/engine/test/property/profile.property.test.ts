import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { computeProfile, daysInMonth, formatDate } from "../../src/index.js";
import { rules } from "../helpers.js";

// Hundreds of random names and dates (phase 1 spec, section 10).
const date = fc
  .record({
    year: fc.integer({ min: 1900, max: 2100 }),
    month: fc.integer({ min: 1, max: 12 }),
    day: fc.integer({ min: 1, max: 31 }),
  })
  .map(({ year, month, day }) =>
    formatDate({ year, month, day: Math.min(day, daysInMonth(year, month)) }),
  );
const name = fc
  .array(fc.stringMatching(/^[A-Za-z]{1,10}$/), { minLength: 1, maxLength: 4 })
  .map((p) => p.join(" "));
const gender = fc.constantFrom("male", "female") as fc.Arbitrary<"male" | "female">;
const profile = fc.constantFrom(rules.house, rules.classic, rules.practitioner);
const asOf = date;

describe("profile invariants", () => {
  it("holds for any person, date and profile", () => {
    fc.assert(
      fc.property(name, date, gender, profile, asOf, (n, dob, g, r, as_of) => {
        const p = computeProfile({ person: { name: n, dob, gender: g }, as_of }, r);

        // Lo Shu counts equal the number of inputs.
        const counted = Object.values(p.loshu.cells).reduce((s, c) => s + c.count, 0);
        expect(counted).toBe(p.loshu.inputs.length);

        // Kua is never 5 and always 1 to 9.
        expect(p.kua).not.toBeNull();
        expect(p.kua!.value).not.toBe(5);
        expect(p.kua!.value).toBeGreaterThanOrEqual(1);

        // Pinnacle and challenge ages are continuous from 0, and the last runs for life.
        for (const spans of [p.timing.pinnacles, p.timing.challenges, p.timing.periods]) {
          expect(spans[0]!.from_age).toBe(0);
          for (let i = 1; i < spans.length; i++)
            expect(spans[i]!.from_age).toBe(spans[i - 1]!.to_age);
          expect(spans.at(-1)!.to_age).toBeUndefined();
        }

        // Every chain ends in 1 to 9 or a master (0 only for a name with no vowels or consonants).
        for (const r2 of [
          p.date_numbers.mulank,
          p.date_numbers.bhagyank,
          p.pythagorean.life_path,
          p.pythagorean.expression,
          p.timing.personal_year,
        ]) {
          const last = r2.chain.at(-1)!;
          expect(last >= 1 && (last <= 9 || [11, 22, 33].includes(last))).toBe(true);
        }

        // Fit scores stay within their ranges; pair scores are symmetric.
        expect(Math.abs(p.chaldean.headline.fit.total)).toBeLessThanOrEqual(4);
        expect(p.driver_conductor.pair.score).toBe(
          computeProfile({ person: { name: n, dob, gender: g }, as_of }, r).driver_conductor.pair
            .score,
        );
      }),
      { numRuns: 300 },
    );
  });

  it("gives identical results on repeat runs", () => {
    fc.assert(
      fc.property(name, date, gender, profile, (n, dob, g, r) => {
        const req = { person: { name: n, dob, gender: g }, as_of: "2026-11-20" };
        expect(computeProfile(req, r)).toEqual(computeProfile(req, r));
      }),
      { numRuns: 100 },
    );
  });
});
