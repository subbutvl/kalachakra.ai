import { describe, expect, it } from "vitest";
import {
  addDays,
  ageOn,
  canonicalJson,
  compareDates,
  daysInMonth,
  EngineError,
  formatDate,
  fromDayNumber,
  inputHash,
  isLeapYear,
  localDateOf,
  monthName,
  parseDate,
  parseOffset,
  parseTime,
  parseUtcInstant,
  sha256Hex,
  sunriseUtcMinutes,
  toDayNumber,
  weekday,
} from "../../src/index.js";

describe("calendar", () => {
  it("parses real dates and rejects impossible ones", () => {
    expect(parseDate("2024-02-29")).toEqual({ year: 2024, month: 2, day: 29 });
    const e = (() => {
      try {
        parseDate("2026-02-30", "person.dob");
      } catch (x) {
        return x as EngineError;
      }
    })();
    expect(e?.toJSON()).toEqual({
      code: "invalid_date",
      field: "person.dob",
      message: "30 February 2026 is not a date.",
    });
    expect(() => parseDate("2023-02-29")).toThrow(/29 February 2023/);
    expect(() => parseDate("2026-13-01")).toThrow(/2026-13-01 is not a date/);
    expect(() => parseDate("14/08/1991")).toThrow(/form YYYY-MM-DD/);
  });

  it("knows leap years and month lengths", () => {
    expect([1900, 2000, 2024, 2026].map(isLeapYear)).toEqual([false, true, true, false]);
    expect(daysInMonth(2024, 2)).toBe(29);
    expect(daysInMonth(2026, 4)).toBe(30);
    expect(monthName(12)).toBe("December");
    expect(monthName(13)).toBe("13");
  });

  it("round-trips day numbers, adds days and finds weekdays", () => {
    expect(toDayNumber({ year: 1970, month: 1, day: 1 })).toBe(0);
    for (const iso of ["1900-03-01", "1991-08-14", "2000-02-29", "2026-11-20"]) {
      expect(formatDate(fromDayNumber(toDayNumber(parseDate(iso))))).toBe(iso);
    }
    expect(formatDate(addDays(parseDate("2024-02-28"), 1))).toBe("2024-02-29");
    expect(formatDate(addDays(parseDate("2026-01-01"), -1))).toBe("2025-12-31");
    expect(weekday(parseDate("2026-11-20"))).toBe(5); // Friday
    expect(compareDates(parseDate("2026-01-02"), parseDate("2026-01-01"))).toBe(1);
  });

  it("counts completed years of age", () => {
    expect(ageOn(parseDate("1991-08-14"), parseDate("2026-08-13"))).toBe(34);
    expect(ageOn(parseDate("1991-08-14"), parseDate("2026-08-14"))).toBe(35);
    expect(ageOn(parseDate("2016-02-29"), parseDate("2025-02-28"))).toBe(8);
    expect(ageOn(parseDate("2016-02-29"), parseDate("2025-03-01"))).toBe(9);
  });

  it("parses times, offsets and UTC instants", () => {
    expect(parseTime("06:45")).toEqual({ hour: 6, minute: 45 });
    expect(() => parseTime("24:00")).toThrow(EngineError);
    expect(parseOffset("+05:30")).toBe(330);
    expect(parseOffset("-04:00")).toBe(-240);
    expect(() => parseOffset("IST")).toThrow(/UTC offset/);
    const t = parseUtcInstant("2026-02-03T19:55Z");
    expect(formatDate(localDateOf(t, 330))).toBe("2026-02-04");
    expect(formatDate(localDateOf(t, 0))).toBe("2026-02-03");
    expect(() => parseUtcInstant("2026-02-03 19:55")).toThrow(EngineError);
  });
});

describe("hash", () => {
  it("is standard SHA-256", () => {
    expect(sha256Hex("")).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
    expect(sha256Hex("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
    expect(sha256Hex("a".repeat(1000))).toBe(
      "41edece42d63e8d9bf515a9ba6932e1c20cbc9f5a5d134645adb5db1b9737ea3",
    );
    expect(sha256Hex("ஆரவ்")).toHaveLength(64);
  });

  it("hashes equal objects equally whatever the key order", () => {
    expect(canonicalJson({ b: 1, a: [1, { d: null, c: "x" }], u: undefined })).toBe(
      '{"a":[1,{"c":"x","d":null}],"b":1}',
    );
    expect(inputHash({ a: 1, b: 2 })).toBe(inputHash({ b: 2, a: 1 }));
    expect(inputHash({ a: 1 })).toMatch(/^sha256:[0-9a-f]{64}$/);
  });
});

describe("sunrise", () => {
  it("is within a few minutes of published times", () => {
    // Chennai, 14 Aug 1991: sunrise about 05:56 IST (00:26 UTC).
    const chennai = sunriseUtcMinutes(parseDate("1991-08-14"), 13.08, 80.27)!;
    const expected = toDayNumber(parseDate("1991-08-14")) * 1440 + 26;
    expect(Math.abs(chennai - expected)).toBeLessThan(5);
    // Sydney, 1 Jan 2026: sunrise about 05:47 local (31 Dec 18:47 UTC), the previous UTC day.
    const sydney = sunriseUtcMinutes(parseDate("2026-01-01"), -33.87, 151.21)!;
    const expectedSyd = toDayNumber(parseDate("2025-12-31")) * 1440 + 18 * 60 + 47;
    expect(Math.abs(sydney - expectedSyd)).toBeLessThan(5);
    // Far north in midwinter: no sunrise.
    expect(sunriseUtcMinutes(parseDate("2026-12-21"), 78.2, 15.6)).toBeNull();
  });
});
