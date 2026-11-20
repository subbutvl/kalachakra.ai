import { describe, expect, it } from "vitest";
import {
  EngineError,
  isVowelAt,
  letterValue,
  normaliseName,
  scoreName,
  sumByVowel,
} from "../../src/index.js";
import { rules } from "../helpers.js";

const tables = rules.house.data.letters;

describe("normaliseName (rules spec 3.1)", () => {
  it("uppercases, strips accents and keeps only A to Z", () => {
    expect(normaliseName("  Aarav   Mehra ")).toEqual({
      text: "AARAV MEHRA",
      parts: ["AARAV", "MEHRA"],
    });
    expect(normaliseName("Zoë Ångström").text).toBe("ZOE ANGSTROM");
    expect(normaliseName("R. K. Narayan").parts).toEqual(["R", "K", "NARAYAN"]);
    expect(normaliseName("Mary-Jane O'Neil").parts).toEqual(["MARY", "JANE", "O", "NEIL"]);
  });

  it("rejects a name with no letters", () => {
    expect(() => normaliseName(" 123 -- ")).toThrow(EngineError);
    try {
      normaliseName("");
    } catch (e) {
      expect((e as EngineError).toJSON()).toEqual({
        code: "invalid_input",
        field: "name",
        message: "A name needs at least one letter A to Z.",
      });
    }
  });
});

describe("letter tables (rules spec 3.2)", () => {
  it("has no 9 in Chaldean and 1 to 9 in Pythagorean", () => {
    expect(Object.values(tables.chaldean)).not.toContain(9);
    expect(new Set(Object.values(tables.pythagorean))).toEqual(
      new Set([1, 2, 3, 4, 5, 6, 7, 8, 9]),
    );
  });

  it("matches the spec rows", () => {
    const row = (system: "chaldean" | "pythagorean", v: number) =>
      Object.entries(tables[system])
        .filter(([, x]) => x === v)
        .map(([l]) => l)
        .sort()
        .join(" ");
    expect(row("chaldean", 1)).toBe("A I J Q Y");
    expect(row("chaldean", 8)).toBe("F P");
    expect(row("pythagorean", 7)).toBe("G P Y");
    expect(row("pythagorean", 9)).toBe("I R");
  });

  it("rejects a letter without a value", () => {
    expect(() => letterValue(tables, "chaldean", "Ä")).toThrow(/no chaldean value/);
  });
});

describe("Y as a vowel (D4)", () => {
  const yAt = (word: string, mode: "never" | "always" | "by_sound") =>
    isVowelAt(tables, word, word.indexOf("Y"), mode);

  it("by sound: a vowel only when not next to another vowel letter", () => {
    expect(yAt("MYRA", "by_sound")).toBe(true);
    expect(yAt("LYNN", "by_sound")).toBe(true);
    expect(yAt("YVONNE", "by_sound")).toBe(true);
    expect(yAt("YASH", "by_sound")).toBe(false);
    expect(yAt("RAY", "by_sound")).toBe(false);
    expect(yAt("PRIYA", "by_sound")).toBe(false);
    expect(yAt("KAVYA", "by_sound")).toBe(false);
  });

  it("never and always do what they say", () => {
    expect(yAt("MYRA", "never")).toBe(false);
    expect(yAt("YASH", "always")).toBe(true);
  });

  it("A, E, I, O, U are always vowels; other letters never are", () => {
    expect(isVowelAt(tables, "AEIOU", 2, "never")).toBe(true);
    expect(isVowelAt(tables, "MYRA", 0, "always")).toBe(false);
    expect(isVowelAt(tables, "MYRA", 9, "always")).toBe(false);
  });
});

describe("scoreName", () => {
  it("scores part by part with a plain-words trace", () => {
    const s = scoreName(tables, "chaldean", "Aarav Mehra", "by_sound");
    expect(s.parts.map((p) => p.total)).toEqual([11, 17]);
    expect(s.total).toBe(28);
    expect(s.trace).toEqual([
      "AARAV: A=1 + A=1 + R=2 + A=1 + V=6 = 11",
      "MEHRA: M=4 + E=5 + H=5 + R=2 + A=1 = 17",
      "Total: 11 + 17 = 28",
    ]);
  });

  it("gives a single-part name no total line", () => {
    expect(scoreName(tables, "pythagorean", "Myra", "by_sound").trace).toEqual([
      "MYRA: M=4 + Y=7 + R=9 + A=1 = 21",
    ]);
  });

  it("splits vowels and consonants by the Y rule", () => {
    const bySound = scoreName(tables, "pythagorean", "Myra Kapoor", "by_sound");
    const never = scoreName(tables, "pythagorean", "Myra Kapoor", "never");
    // D4: Y by sound makes Myra's soul urge 21 → 3 rather than 14 → 5.
    expect(sumByVowel(bySound, true)).toBe(21);
    expect(sumByVowel(never, true)).toBe(14);
    expect(sumByVowel(never, false)).toBe(38);
  });
});
