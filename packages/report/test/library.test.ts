import { textFiles } from "@kalachakra/texts";
import { describe, expect, it } from "vitest";
import { allKeys, fill, library, loadLibrary, textFor, LANGUAGES } from "../src/index.js";

// The completeness check (phase 1 spec 4.5): every key the report can ask for
// has text in every language, nothing extra hides in the library, and both
// languages hold exactly the same keys.
describe("text library", () => {
  const keys = allKeys();

  for (const lang of LANGUAGES) {
    it(`${lang}: every catalogue key has text`, () => {
      const lib = library(lang);
      const missing = [...keys].filter((k) => !lib.blocks.has(k));
      expect(missing).toEqual([]);
    });

    it(`${lang}: holds no keys outside the catalogue (other than ui.*)`, () => {
      const lib = library(lang);
      const extra = [...lib.blocks.keys()].filter((k) => !k.startsWith("ui.") && !keys.has(k));
      expect(extra).toEqual([]);
    });

    it(`${lang}: every block is a draft or reviewed, and remedies carry tags`, () => {
      const lib = library(lang);
      for (const [k, b] of lib.blocks) {
        expect(["draft", "reviewed"], k).toContain(b.status);
        if (k.startsWith("loshu.remedy.")) expect(b.tags?.length, k).toBe(1);
      }
    });
  }

  it("English and Tamil hold the same keys", () => {
    const en = [...library("en").blocks.keys()].sort();
    const ta = [...library("ta").blocks.keys()].sort();
    expect(ta).toEqual(en);
  });

  it("Tamil text is really Tamil", () => {
    const ta = library("ta");
    const tamil = /[஀-௿]/;
    const notTamil = [...ta.blocks.entries()]
      .filter(([k, b]) => !tamil.test(b.text) && k !== "ui.trace.lang")
      .map(([k]) => k);
    expect(notTamil).toEqual([]);
  });

  it("covers about the expected number of blocks", () => {
    expect(keys.size).toBeGreaterThan(850);
    expect(library("en").blocks.size).toBeGreaterThan(1150);
  });

  it("rejects unknown placeholders, bad files and duplicates", () => {
    expect(() =>
      loadLibrary("0", "en", {
        x: { language: "en", module: "x", blocks: { "a.b": "Hi {nobody}" } },
      }),
    ).toThrow(/unknown placeholder \{nobody\}/);
    expect(() =>
      loadLibrary("0", "en", { x: { language: "en", module: "x", blocks: { nodot: "x" } } }),
    ).toThrow(/invalid/);
    expect(() =>
      loadLibrary("0", "en", {
        x: { language: "en", module: "x", blocks: { "a.b": "1" } },
        y: { language: "en", module: "y", blocks: { "a.b": "2" } },
      }),
    ).toThrow(/defined twice/);
    expect(() =>
      loadLibrary("0", "en", { x: { language: "ta", module: "x", blocks: {} } }),
    ).toThrow(/says language ta/);
    expect(() => library("hi" as "en")).toThrow(/No text library/);
    expect(Object.keys(textFiles)).toEqual(["en", "ta"]);
  });

  it("fills placeholders and picks the child wording", () => {
    expect(fill("Hello {name}, {number}", { name: "Asha", number: 5 })).toBe("Hello Asha, 5");
    expect(fill("Keep {missing}", {})).toBe("Keep {missing}");
    const lib = library("en");
    expect(textFor(lib, "mulank.1.work", "child")).toMatch(/^At school/);
    expect(textFor(lib, "mulank.1.work", "adult")).toMatch(/^Work goes best/);
    expect(textFor(lib, "mulank.1.nature", "child")).toBe(textFor(lib, "mulank.1.nature", "adult"));
    expect(textFor(lib, "no.such", "adult")).toBeUndefined();
  });
});
