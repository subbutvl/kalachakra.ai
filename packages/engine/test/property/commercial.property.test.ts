import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  computeBusiness,
  computeCompatibility,
  computeMobile,
  computeProfile,
  daysInMonth,
  formatDate,
  suggestNames,
} from "../../src/index.js";
import { rules } from "../helpers.js";

const date = fc
  .record({
    year: fc.integer({ min: 1940, max: 2020 }),
    month: fc.integer({ min: 1, max: 12 }),
    day: fc.integer({ min: 1, max: 31 }),
  })
  .map(({ year, month, day }) =>
    formatDate({ year, month, day: Math.min(day, daysInMonth(year, month)) }),
  );
const name = fc
  .array(fc.stringMatching(/^[A-Za-z]{2,8}$/), { minLength: 1, maxLength: 3 })
  .map((p) => p.join(" "));
const person = fc.record({
  name,
  dob: date,
  gender: fc.constantFrom("male", "female") as fc.Arbitrary<"male" | "female">,
});
const profileRules = fc.constantFrom(rules.house, rules.classic, rules.practitioner);
const mobile = fc.stringMatching(/^[6-9][0-9]{9}$/);
const build = (p: { name: string; dob: string; gender: "male" | "female" }, r = rules.house) =>
  computeProfile({ person: p, as_of: "2026-11-20", options: { name_suggestions: 0 } }, r);

describe("commercial invariants", () => {
  it("mobile readings: pair kinds add up, fit within −6..+6, score within 0..100", () => {
    fc.assert(
      fc.property(
        person,
        fc.array(mobile, { minLength: 1, maxLength: 5 }),
        profileRules,
        (p, nums, r) => {
          const m = computeMobile({ numbers: nums }, build(p, r), r);
          for (const x of m.readings) {
            const f = x.flow!;
            expect(f.smooth + f.neutral + f.clash + f.pause).toBe(f.pairs.length);
            expect(Math.abs(x.fit.total)).toBeLessThanOrEqual(6);
            expect(x.score.value).toBeGreaterThanOrEqual(0);
            expect(x.score.value).toBeLessThanOrEqual(100);
            expect(x.total.reduced).toBe(((x.total.chain[0]! - 1) % 9) + 1);
          }
          expect(m.ranked.map((x) => x.score)).toEqual(
            [...m.ranked.map((x) => x.score)].sort((a, b) => b - a),
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  it("compatibility is symmetric and within 0..100", () => {
    fc.assert(
      fc.property(person, person, (a, b) => {
        const pa = build(a);
        const pb = build(b);
        const ab = computeCompatibility(pa, pb, "couple", rules.house);
        const ba = computeCompatibility(pb, pa, "couple", rules.house);
        expect(ab.score).toBe(ba.score);
        expect(ab.score).toBeGreaterThanOrEqual(0);
        expect(ab.score).toBeLessThanOrEqual(100);
      }),
      { numRuns: 100 },
    );
  });

  it("business ranking is ordered and suggestions stay within limits", () => {
    fc.assert(
      fc.property(person, fc.array(name, { minLength: 1, maxLength: 5 }), (p, names) => {
        const owner = build(p);
        const b = computeBusiness({ names, spelling_ideas: 0 }, owner, [], rules.house);
        expect(b.names.map((n) => n.rank)).toEqual(names.map((_, i) => i + 1));
        for (let i = 1; i < b.names.length; i++)
          expect(b.names[i - 1]!.total).toBeGreaterThanOrEqual(b.names[i]!.total);
        const s = suggestNames(
          rules.house,
          p.name,
          owner.date_numbers.mulank.reduced,
          owner.date_numbers.bhagyank.reduced,
        );
        expect(s.suggestions.length).toBeLessThanOrEqual(5);
        for (const x of s.suggestions) expect(x.edits.length).toBeLessThanOrEqual(2);
      }),
      { numRuns: 100 },
    );
  });
});
