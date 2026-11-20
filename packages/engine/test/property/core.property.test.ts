import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { digitSum, pairScore, reduce, scoreName, toCompound } from "../../src/index.js";
import { rules } from "../helpers.js";

const digit = fc.integer({ min: 1, max: 9 });
const anyNumber = fc.integer({ min: 0, max: 10_000_000 });
const name = fc
  .array(fc.stringMatching(/^[A-Za-z]{1,12}$/), { minLength: 1, maxLength: 4 })
  .map((parts) => parts.join(" "));
const profiles = Object.values(rules);

describe("reduction invariants", () => {
  it("every chain ends in 0 to 9, or in a master when masters are kept", () => {
    fc.assert(
      fc.property(anyNumber, fc.boolean(), (n, keep) => {
        const r = reduce(n, { keepMasters: keep });
        const last = r.chain.at(-1)!;
        expect(last).toBe(r.value);
        expect(last <= 9 || (keep && [11, 22, 33].includes(last))).toBe(true);
        expect(r.reduced).toBeLessThanOrEqual(9);
      }),
    );
  });

  it("each step is the digit sum of the one before, and digital root is preserved", () => {
    fc.assert(
      fc.property(anyNumber, (n) => {
        const { chain, reduced } = reduce(n);
        for (let i = 1; i < chain.length; i++) expect(chain[i]).toBe(digitSum(chain[i - 1]!));
        expect(reduced).toBe(n === 0 ? 0 : 1 + ((n - 1) % 9));
      }),
    );
  });

  it("is identical on repeat runs", () => {
    fc.assert(
      fc.property(anyNumber, (n) => {
        expect(reduce(n)).toEqual(reduce(n));
      }),
    );
  });

  it("compounds never exceed 52 and keep the digital root", () => {
    fc.assert(
      fc.property(anyNumber, (n) => {
        const { compound } = toCompound(n);
        expect(compound).toBeLessThanOrEqual(Math.max(52, n <= 52 ? n : 0));
        expect(reduce(compound).reduced).toBe(reduce(n).reduced);
      }),
    );
  });
});

describe("pair score invariants", () => {
  it("is symmetric and within −2 to +2 under every profile", () => {
    for (const r of profiles) {
      fc.assert(
        fc.property(digit, digit, (a, b) => {
          const ab = pairScore(r.data.planets, r.settings, a, b);
          const ba = pairScore(r.data.planets, r.settings, b, a);
          expect(ab.score).toBe(ba.score);
          expect(ab.score).toBeGreaterThanOrEqual(-2);
          expect(ab.score).toBeLessThanOrEqual(2);
          if (a === b) expect(ab.score).toBe(2);
        }),
      );
    }
  });
});

describe("name scoring invariants", () => {
  it("part totals add up and every letter is scored, in both systems", () => {
    fc.assert(
      fc.property(
        name,
        fc.constantFrom("chaldean", "pythagorean") as fc.Arbitrary<"chaldean" | "pythagorean">,
        (n, system) => {
          const s = scoreName(rules.house.data.letters, system, n, "by_sound");
          expect(s.parts.reduce((t, p) => t + p.total, 0)).toBe(s.total);
          const letters = n.replace(/[^A-Za-z]/g, "").length;
          expect(s.parts.flatMap((p) => p.letters)).toHaveLength(letters);
        },
      ),
    );
  });

  it("does not depend on case or extra spaces", () => {
    fc.assert(
      fc.property(name, (n) => {
        const t = rules.house.data.letters;
        expect(scoreName(t, "chaldean", `  ${n.toLowerCase()}  `, "by_sound").total).toBe(
          scoreName(t, "chaldean", n.toUpperCase(), "by_sound").total,
        );
      }),
    );
  });
});
