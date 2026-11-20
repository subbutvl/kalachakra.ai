import { describe, expect, it } from "vitest";
import { computeProfile, diffResults } from "../../src/index.js";
import { rules } from "../helpers.js";

describe("diffResults (rules diff)", () => {
  it("finds nothing when the results are the same", () => {
    expect(
      diffResults({ a: 1, b: [1, 2], c: { d: "x" } }, { a: 1, b: [1, 2], c: { d: "x" } }),
    ).toEqual([]);
  });

  it("lists changed leaves with their paths, and whole lists of plain values", () => {
    const changes = diffResults(
      { a: 1, b: [1, 2], c: { d: "x" } },
      { a: 2, b: [1, 3], c: { d: "x", e: true } },
    );
    expect(changes).toEqual([
      { path: "a", a: 1, b: 2 },
      { path: "b", a: [1, 2], b: [1, 3] },
      { path: "c.e", a: undefined, b: true },
    ]);
  });

  it("leaves out working and reference fields", () => {
    expect(
      diffResults({ trace: ["x"], meta: { v: 1 }, n: 1 }, { trace: ["y"], meta: { v: 2 }, n: 1 }),
    ).toEqual([]);
  });

  it("shows what a rule profile changes for a real person", () => {
    const input = {
      person: { name: "Aarav Mehra", dob: "1991-08-14", gender: "male" as const },
      as_of: "2026-11-20",
    };
    const a = computeProfile(input, rules.house);
    expect(diffResults(a, computeProfile(input, rules.house))).toEqual([]);
    const changes = diffResults(a, computeProfile(input, rules.classic));
    for (const c of changes) expect(c.path).not.toMatch(/(^|\.)(trace|meta)(\.|$)/);
  });
});
