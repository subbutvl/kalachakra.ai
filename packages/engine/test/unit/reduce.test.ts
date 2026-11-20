import { describe, expect, it } from "vitest";
import {
  digitSum,
  EngineError,
  formatChain,
  formatValue,
  isMaster,
  keepMasters,
  reduce,
  reduceKeepMaster,
  toCompound,
} from "../../src/index.js";

describe("digitSum", () => {
  it("sums decimal digits", () => {
    expect(digitSum(0)).toBe(0);
    expect(digitSum(7)).toBe(7);
    expect(digitSum(1991)).toBe(20);
    expect(digitSum(14081991)).toBe(33);
  });

  it("rejects negatives, fractions and unsafe numbers", () => {
    expect(() => digitSum(-1)).toThrow(EngineError);
    expect(() => digitSum(1.5)).toThrow(/whole number/);
    expect(() => digitSum(Number.MAX_SAFE_INTEGER + 2)).toThrow(EngineError);
  });
});

describe("reduce", () => {
  it("keeps the full chain (rules spec 3.1)", () => {
    expect(reduce(28)).toEqual({ value: 1, chain: [28, 10, 1], reduced: 1 });
    expect(reduce(5)).toEqual({ value: 5, chain: [5], reduced: 5 });
    expect(reduce(0)).toEqual({ value: 0, chain: [0], reduced: 0 });
    expect(reduce(999999)).toEqual({ value: 9, chain: [999999, 54, 9], reduced: 9 });
  });

  it("flags a dropped master (Bhagyank 33 → 6)", () => {
    expect(reduce(33)).toEqual({ value: 6, chain: [33, 6], reduced: 6, master: 33 });
    expect(reduce(29)).toEqual({ value: 2, chain: [29, 11, 2], reduced: 2, master: 11 });
  });

  it("stops at 11, 22, 33 when keeping masters", () => {
    expect(reduceKeepMaster(29)).toEqual({ value: 11, chain: [29, 11], reduced: 2, master: 11 });
    expect(reduceKeepMaster(22)).toEqual({ value: 22, chain: [22], reduced: 4, master: 22 });
    expect(reduceKeepMaster(33)).toEqual({ value: 33, chain: [33], reduced: 6, master: 33 });
    expect(reduceKeepMaster(48)).toEqual({ value: 3, chain: [48, 12, 3], reduced: 3 });
    // 44 is not a master; 8 is reached directly.
    expect(reduceKeepMaster(44)).toEqual({ value: 8, chain: [44, 8], reduced: 8 });
  });

  it("knows the masters", () => {
    expect([11, 22, 33].every(isMaster)).toBe(true);
    expect([1, 10, 44, 55].some(isMaster)).toBe(false);
  });
});

describe("toCompound", () => {
  it("reduces totals above 52 until 52 or less (59 → 14)", () => {
    expect(toCompound(59)).toEqual({ compound: 14, chain: [59, 14] });
    expect(toCompound(28)).toEqual({ compound: 28, chain: [28] });
    expect(toCompound(52)).toEqual({ compound: 52, chain: [52] });
    expect(toCompound(73)).toEqual({ compound: 10, chain: [73, 10] });
    expect(toCompound(199)).toEqual({ compound: 19, chain: [199, 19] });
  });
});

describe("formatting", () => {
  it("writes chains and kept masters as the report does", () => {
    expect(formatChain([33, 6])).toBe("33 → 6");
    expect(formatValue(reduceKeepMaster(29))).toBe("11/2");
    expect(formatValue(reduce(28))).toBe("1");
  });
});

describe("keepMasters (D3)", () => {
  it("follows masters.mode per context", () => {
    const def = { "masters.mode": "pythagorean_and_personal_years" } as const;
    expect(keepMasters(def, "pythagorean")).toBe(true);
    expect(keepMasters(def, "personal_year")).toBe(true);
    expect(keepMasters(def, "vedic")).toBe(false);
    expect(keepMasters({ "masters.mode": "always_reduce" }, "pythagorean")).toBe(false);
    expect(keepMasters({ "masters.mode": "everywhere" }, "vedic")).toBe(true);
  });
});
