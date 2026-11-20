import { describe, expect, it } from "vitest";
import { pairScore, reduce, scoreName, sumByVowel, toCompound } from "../../src/index.js";
import { rules } from "../helpers.js";
import golden from "./benchmark-m1.json" with { type: "json" };

// Golden tests must match exactly: a change that alters any of these numbers
// fails the build until the rules version is bumped on purpose (spec section 10).
const r = rules.classic;
expect(r.profile.id).toBe(golden.profile);

describe("benchmark: name totals", () => {
  for (const g of golden.names) {
    it(`${g.name} (${g.sample})`, () => {
      const c = scoreName(r.data.letters, "chaldean", g.name, r.settings["letters.y_vowel"]);
      if ("parts" in g.chaldean) expect(c.parts.map((p) => p.total)).toEqual(g.chaldean.parts);
      expect(c.total).toBe(g.chaldean.total);
      expect(reduce(c.total).chain).toEqual(g.chaldean.chain);
      if ("compound" in g.chaldean) expect(toCompound(c.total).compound).toBe(g.chaldean.compound);

      if ("pythagorean" in g && g.pythagorean) {
        const p = scoreName(r.data.letters, "pythagorean", g.name, r.settings["letters.y_vowel"]);
        expect(p.parts.map((x) => x.total)).toEqual(g.pythagorean.parts);
        expect(p.total).toBe(g.pythagorean.total);
        expect(reduce(p.total).chain).toEqual(g.pythagorean.chain);
        expect(sumByVowel(p, true)).toBe(g.pythagorean.vowels);
        expect(sumByVowel(p, false)).toBe(g.pythagorean.consonants);
      }
    });
  }
});

describe("benchmark: pair scores", () => {
  for (const g of golden.pairs) {
    it(`${g.sample}: ${g.a}–${g.b} = ${g.score}`, () => {
      expect(pairScore(r.data.planets, r.settings, g.a, g.b).score).toBe(g.score);
      // Pair scores do not differ between profiles in v1.0.
      expect(pairScore(rules.house.data.planets, rules.house.settings, g.a, g.b).score).toBe(
        g.score,
      );
    });
  }
});
