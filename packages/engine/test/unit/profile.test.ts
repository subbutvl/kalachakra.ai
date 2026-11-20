import { describe, expect, it } from "vitest";
import {
  computeProfile,
  EngineError,
  resolveRules,
  type PersonInput,
  type ProfileResult,
} from "../../src/index.js";
import { catalog, rules } from "../helpers.js";

const AS_OF = "2026-11-20";
const run = (
  person: Partial<PersonInput> & { dob: string },
  r = rules.house,
  asOf = AS_OF,
): ProfileResult =>
  computeProfile({ person: { name: "Test Person", gender: "male", ...person }, as_of: asOf }, r);
const custom = (overrides: Record<string, unknown>) =>
  resolveRules(catalog, { id: "custom", name: "Custom", base: "v1.0", overrides });

describe("computeProfile: input checks", () => {
  it("rejects bad requests with a field", () => {
    const err = (fn: () => unknown) => {
      try {
        fn();
      } catch (e) {
        return e as EngineError;
      }
      throw new Error("no error");
    };
    expect(err(() => run({ dob: "2026-02-30" }))).toMatchObject({
      code: "invalid_date",
      field: "person.dob",
    });
    expect(err(() => run({ dob: "1991-08-14" }, rules.house, "20-11-2026"))).toMatchObject({
      code: "invalid_input",
      field: "as_of",
    });
    expect(err(() => run({ dob: "1991-08-14", name: "" }))).toMatchObject({
      code: "invalid_input",
      field: "person.name",
    });
    expect(err(() => run({ dob: "1991-08-14", name: "123" }))).toMatchObject({
      code: "invalid_input",
      field: "name",
    });
    expect(err(() => run({ dob: "1991-08-14", birth_time: "25:00" }))).toMatchObject({
      code: "invalid_time",
    });
  });

  it("is deterministic and carries meta", () => {
    const a = run({ dob: "1991-08-14", name: "Aarav Mehra" });
    const b = run({ dob: "1991-08-14", name: "Aarav Mehra" });
    expect(a).toEqual(b);
    expect(a.meta).toMatchObject({
      engine: "0.1.0",
      rules: "v1.0",
      profile: "house-default",
      as_of: AS_OF,
    });
    expect(run({ dob: "1991-08-14", name: "Aarav Mehra" }, rules.classic).meta.input_hash).not.toBe(
      a.meta.input_hash,
    );
  });
});

describe("date numbers (rules spec 3.3)", () => {
  it.each([
    [10, 1, []],
    [11, 2, []],
    [13, 4, [13]],
    [16, 7, [16]],
    [19, 1, [19]],
    [20, 2, []],
    [22, 4, []],
    [29, 2, []],
    [30, 3, []],
    [31, 4, []],
  ])("day %i gives Mulank %i, karmic debt %j", (day, mulank, debt) => {
    const p = run({ dob: `2000-01-${String(day).padStart(2, "0")}` });
    expect(p.date_numbers.mulank.value).toBe(mulank);
    expect(p.date_numbers.karmic_debt).toEqual(expect.arrayContaining(debt));
    expect(p.date_numbers.master_day).toBe(day === 11 || day === 22);
    expect(p.date_numbers.birthday.value).toBe(day);
  });

  it("keeps master days only when masters are kept everywhere (D3)", () => {
    expect(run({ dob: "2000-01-29" }).date_numbers.mulank).toMatchObject({ value: 2, master: 11 });
    expect(run({ dob: "2000-01-29" }, rules.practitioner).date_numbers.mulank).toMatchObject({
      value: 11,
      reduced: 2,
    });
  });

  it("handles 29 February", () => {
    const p = run({ dob: "2000-02-29" });
    expect(p.date_numbers.bhagyank.trace?.[0]).toBe("2 + 9 + 0 + 2 + 2 + 0 + 0 + 0 = 15 → 6");
    expect(p.timing.age).toBe(26);
  });

  it("can sum the Bhagyank components first (D5)", () => {
    const p = run({ dob: "1991-08-14" }, custom({ "bhagyank.sum_method": "components_first" }));
    expect(p.date_numbers.bhagyank.value).toBe(6);
    expect(p.date_numbers.bhagyank.trace?.[0]).toMatch(
      /^Day, month and year reduced first: 5 \+ 8 \+ 2 = 15 → 6/,
    );
  });
});

describe("names (rules spec 3.1, 3.5, D1)", () => {
  it("analyses the daily name as headline and the birth certificate name beside it", () => {
    const p = run({
      dob: "1991-08-14",
      name: "Aarav Mehra",
      other_names: [{ kind: "birth_certificate", name: "Aarav Kumar Mehra" }],
    });
    expect(p.chaldean.headline).toMatchObject({ kind: "daily_use", normalised: "AARAV MEHRA" });
    expect(p.chaldean.others[0]).toMatchObject({
      kind: "birth_certificate",
      normalised: "AARAV KUMAR MEHRA",
    });
    expect(p.chaldean.others[0]!.parts.initials?.form).toBe("A K MEHRA");
    // Pythagorean numbers use the full birth name.
    expect(p.pythagorean.name).toBe("AARAV KUMAR MEHRA");
    const only = run(
      {
        dob: "1991-08-14",
        name: "Aarav",
        other_names: [{ kind: "birth_certificate", name: "Aarav Kumar" }],
      },
      custom({ "names.analysed": "birth_certificate" }),
    );
    expect(only.chaldean.headline.kind).toBe("birth_certificate");
    expect(only.chaldean.others).toHaveLength(0);
    expect(
      run(
        {
          dob: "1991-08-14",
          name: "Aarav",
          other_names: [{ kind: "birth_certificate", name: "X Y" }],
        },
        custom({ "names.analysed": "daily_use" }),
      ).chaldean.others,
    ).toHaveLength(0);
  });

  it("copes with single-letter names and names with initials", () => {
    const p = run({ dob: "1991-08-14", name: "R. K. Narayan" });
    expect(p.chaldean.headline.parts.first.total).toBe(2);
    expect(p.chaldean.headline.parts.initials?.form).toBe("R K NARAYAN");
    const q = run({ dob: "1991-08-14", name: "Q" });
    expect(q.chaldean.headline.parts.surname).toBeUndefined();
    expect(q.pythagorean.first_vowel).toBeUndefined();
    expect(q.pythagorean.soul_urge.value).toBe(0);
  });

  it("names the compound, shares readings, and can switch classes off (D8)", () => {
    const p = run({ dob: "1991-08-14", name: "Loomcraft Works" });
    expect(p.chaldean.headline.name_number.compound).toMatchObject({
      value: 14,
      name: "Movement",
      class: "mixed",
      text_key: "compound.14",
    });
    const myra = run({ dob: "2016-03-09", name: "Myra Kapoor" });
    expect(myra.chaldean.headline.name_number.compound).toMatchObject({
      value: 35,
      read_like: 26,
      text_key: "compound.26",
      class: "unfavourable",
    });
    expect(myra.flags).toContainEqual({
      flag: "unfavourable_compound",
      where: "chaldean.daily_use",
      value: 35,
    });
    const off = run({ dob: "2016-03-09", name: "Myra Kapoor" }, rules.classic);
    expect(off.chaldean.headline.name_number.compound?.class).toBeUndefined();
    expect(
      run({ dob: "1991-08-14", name: "Ab" }).chaldean.headline.name_number.compound,
    ).toBeUndefined();
  });

  it("labels a supported name", () => {
    // "Aarave Mehra" (spelling idea): 33 → 6 with Mulank 5 and Bhagyank 6, +2 and +2; 33 reads like 24, favourable.
    const p = run({ dob: "1991-08-14", name: "Aarave Mehra" });
    expect(p.chaldean.headline.fit).toMatchObject({ total: 4, label: "supported" });
    // "Aarav" alone: 11 → 2 (Moon): Mercury sees Moon as enemy, Moon sees Mercury as friend: 0; Venus sees Moon as enemy, Moon sees Venus as neutral: −1.
    const q = run({ dob: "1991-08-14", name: "Aarav" });
    expect(q.chaldean.headline.fit).toMatchObject({ mulank: 0, bhagyank: -1, label: "opposed" });
    // A favourable-looking fit with an unfavourable compound is only "mixed": Myra's 35 with Mulank 9.
    const r = run({ dob: "2016-03-01", name: "Myra Kapoor" });
    expect(r.chaldean.headline.fit.label).not.toBe("supported");
  });
});

describe("Pythagorean (rules spec 3.6)", () => {
  it("reads Y by sound (D4)", () => {
    const by = run({ dob: "2016-03-09", name: "Myra Kapoor" });
    const never = run({ dob: "2016-03-09", name: "Myra Kapoor" }, rules.classic);
    expect(by.pythagorean.soul_urge.value).toBe(3);
    expect(never.pythagorean.soul_urge.value).toBe(5);
  });

  it("fills the inner layers", () => {
    const p = run({ dob: "1991-08-14", name: "Aarav Mehra" }).pythagorean;
    expect(p.hidden_passion.values).toEqual([1]);
    expect(p.karmic_lessons.values).toEqual([2, 3, 6, 7]);
    expect(p.subconscious_self.value).toBe(5);
    expect(p.balance.value).toBe(5);
    expect(p.rational_thought.value).toBe(3);
    expect([p.cornerstone.letter, p.capstone.letter, p.first_vowel?.letter]).toEqual([
      "A",
      "V",
      "A",
    ]);
    expect(p.planes_of_expression.mental.count).toBe(5);
    expect(p.birth_chart.arrows).toEqual([
      { id: "357", kind: "weakness", text_key: "pythagorean.arrow.357.weakness" },
    ]);
    expect(p.maturity_other).toMatchObject({ system: "chaldean", value: 7 });
  });

  it("can headline the Chaldean maturity (D9)", () => {
    const p = run(
      { dob: "1991-08-14", name: "Aarav Mehra" },
      custom({ "maturity.headline": "chaldean", "maturity.show_other": false }),
    ).pythagorean;
    expect(p.maturity).toMatchObject({ system: "chaldean", value: 7 });
    expect(p.maturity_other).toBeUndefined();
  });

  it("keeps masters in Pythagorean numbers (D3)", () => {
    // 29 Nov 1995: 2+9 → 11, 11 kept as a component; life path 11 + 11 + 24→6 = 28 → 10 → 1.
    const p = run({ dob: "1995-11-29" }).pythagorean.life_path;
    expect(p.trace?.[0]).toBe("Day 29 → 11, month 11, year 1995 → 24 → 6");
  });
});

describe("Lo Shu (rules spec 3.7)", () => {
  it("adds the Mulank only for two-digit days by default (D10)", () => {
    expect(run({ dob: "2016-03-09" }).loshu.inputs.some((i) => i.source === "mulank")).toBe(false);
    expect(
      run({ dob: "1991-08-14" }).loshu.inputs.filter((i) => i.source === "mulank"),
    ).toHaveLength(1);
    expect(
      run({ dob: "1991-08-14" }, custom({ "loshu.include_mulank": "never" })).loshu.trace,
    ).toContain("Mulank not added (switched off)");
  });

  it("marks where each copy of a number came from", () => {
    const g = run({ dob: "1991-08-14", name: "Aarav Mehra" }).loshu;
    expect(g.cells["9"]).toMatchObject({
      count: 3,
      band: "triple",
      sources: ["dob", "dob", "kua"],
      direction: "S",
    });
    expect(g.cells["2"]).toMatchObject({
      count: 0,
      band: "missing",
      direction: "SW",
      element: "earth",
    });
    expect(g.planes.will!.state).toBe("complete");
    expect(g.planes.mental!.state).toBe("partial");
    expect(g.remedies.map((r) => r.number)).toEqual([2, 3, 7]);
    expect(g.remedies[0]!.tags.map((t) => t.tag)).toEqual([
      "colour",
      "direction",
      "habit",
      "mantra",
    ]);
    expect(g.remedies[1]!.colours).toEqual(["green"]);
  });

  it("shows four or more and empty planes", () => {
    const g = run({ dob: "1911-11-11" }).loshu;
    expect(g.cells["1"]!.band).toBe("four_plus");
    expect(run({ dob: "2000-02-02", gender: "unspecified" }).loshu.planes.thought!.state).toBe(
      "empty",
    );
  });

  it("turns gemstones on only when the profile does (D19)", () => {
    expect(
      run({ dob: "1991-08-14" }, rules.practitioner).loshu.remedies[0]!.tags.map((t) => t.tag),
    ).toContain("gemstone");
  });
});

describe("Kua (rules spec 3.8, D12)", () => {
  const k = (
    dob: string,
    gender: "male" | "female",
    r = rules.house,
    extra: Partial<PersonInput> = {},
  ) => run({ dob, gender, ...extra }, r).kua!;

  it("uses the previous year before Lichun", () => {
    // Lichun 2026 falls on 4 Feb in India (3 Feb 19:55 UTC).
    expect(k("2026-02-03", "male").solar_year).toBe(2025);
    expect(k("2026-02-05", "male").solar_year).toBe(2026);
    expect(k("2026-01-15", "female").solar_year).toBe(2025);
  });

  it("decides the Lichun day itself by birth time, and flags it", () => {
    const noTime = run({ dob: "2026-02-04" });
    expect(noTime.kua!.solar_year).toBe(2026);
    expect(noTime.person.notes[0]).toMatch(/Lichun day/);
    expect(k("2026-02-04", "male", rules.house, { birth_time: "01:00" }).solar_year).toBe(2025);
    expect(k("2026-02-04", "male", rules.house, { birth_time: "06:00" }).solar_year).toBe(2026);
    expect(k("2026-02-04", "male", rules.house, { birth_time: "01:30" }).uncertain).toMatch(
      /within 20 minutes/,
    );
    // Outside India the local Lichun date can differ.
    expect(
      k("2026-02-03", "male", rules.house, {
        birth_time: "20:30",
        birth_place: { utc_offset: "+00:00" },
      }).solar_year,
    ).toBe(2026);
  });

  it("follows the other cutoffs", () => {
    expect(k("2026-02-03", "male", rules.classic).solar_year).toBe(2026);
    expect(k("2026-02-03", "male", rules.practitioner).solar_year).toBe(2025);
    expect(k("2026-02-04", "male", rules.practitioner).solar_year).toBe(2026);
    expect(k("2101-03-01", "male").trace[0]).toMatch(/No Lichun entry/);
  });

  it("maps Kua 5 and needs a basis", () => {
    // 1986: s = 24 → 6; male 11 − 6 = 5 → 2. 2008: s = 10 → 1; female 4 + 1 = 5 → 8.
    expect(k("1986-06-01", "male").value).toBe(2);
    expect(k("2008-06-01", "female").value).toBe(8);
    expect(k("2008-06-01", "female").group).toBe("west");
    expect(run({ dob: "1991-08-14", gender: "unspecified" }).kua).toBeNull();
    expect(run({ dob: "1991-08-14", gender: "unspecified", kua_basis: "female" }).kua?.basis).toBe(
      "female",
    );
  });
});

describe("timing (rules spec 3.9)", () => {
  it("lists twelve months ahead across the year end", () => {
    const t = run({ dob: "1991-08-14" }).timing;
    expect(t.months_ahead.map((m) => `${m.year}-${m.month}`).slice(0, 3)).toEqual([
      "2026-11",
      "2026-12",
      "2027-1",
    ]);
    expect(t.next_10_years.map((y) => y.year)).toEqual([
      2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033, 2034, 2035,
    ]);
  });

  it("notes the birthday-to-birthday year and can switch to it (D13)", () => {
    const before = run({ dob: "1991-12-14" }).timing;
    expect(before.birthday_year).toEqual({
      from_year: 2025,
      value: expect.any(Number),
      reduced: expect.any(Number),
    });
    expect(run({ dob: "1991-08-14" }).timing.birthday_year).toBeUndefined();
    const b = run({ dob: "1991-12-14" }, custom({ "personal_year.start": "birthday" })).timing;
    expect(b.personal_year.year).toBe(2025);
  });

  it("runs the Mulank-led dasha and can switch it off (D14)", () => {
    const t = run({ dob: "1991-08-14" }).timing.dasha;
    expect(t.periods.slice(0, 3)).toEqual([
      { number: 5, from_age: 0, to_age: 5 },
      { number: 6, from_age: 5, to_age: 11 },
      { number: 7, from_age: 11, to_age: 18 },
    ]);
    expect(t.current).toEqual({ number: 1, from_age: 35, to_age: 36 });
    expect(t.sub_period).toBe(5);
    expect(run({ dob: "1991-08-14" }, rules.classic).timing.dasha).toEqual({
      method: "none",
      periods: [],
    });
  });

  it("finds the essence from letter transits", () => {
    const t = run({ dob: "1991-08-14", name: "Aarav Mehra" }).timing;
    expect(t.transits).toEqual([
      { part: "AARAV", letter: "R", value: 9 },
      { part: "MEHRA", letter: "E", value: 5 },
    ]);
    expect(t.essence.value).toBe(5);
  });
});

describe("D2 sunrise day boundary", () => {
  const sunrise = custom({ "date.day_boundary": "sunrise" });
  it("moves a birth before sunrise to the previous Vedic day", () => {
    const p = run(
      { dob: "1991-08-14", birth_time: "04:30", birth_place: { lat: 13.08, lon: 80.27 } },
      sunrise,
    );
    expect(p.person.working_date).toBe("1991-08-13");
    expect(p.date_numbers.mulank.value).toBe(4);
    const after = run(
      { dob: "1991-08-14", birth_time: "07:00", birth_place: { lat: 13.08, lon: 80.27 } },
      sunrise,
    );
    expect(after.person.working_date).toBe("1991-08-14");
  });

  it("needs time and place, and says so", () => {
    const p = run({ dob: "1991-08-14" }, sunrise);
    expect(p.person.working_date).toBe("1991-08-14");
    expect(p.person.notes[0]).toMatch(/needs birth time, latitude and longitude/);
  });
});

describe("driver–conductor and lucky set", () => {
  it("marks special pairs (D7)", () => {
    // 4 August 2003: Mulank 4, Bhagyank 4+8+2+3 = 17 → 8.
    const p = run({ dob: "2003-08-04" });
    expect(p.driver_conductor).toMatchObject({ driver: 4, conductor: 8, special: "4-8" });
    expect(p.driver_conductor.text_keys).toContain("driver_conductor.special.4-8");
    expect(run({ dob: "2003-08-04" }, rules.classic).driver_conductor.special).toBeUndefined();
  });

  it("ranks lucky numbers by the Bhagyank", () => {
    const l = run({ dob: "2016-03-09" }).lucky;
    expect(l.numbers).toEqual([1, 2, 3, 9]);
    // With Bhagyank 3: 1, 3 and 9 score +2 (Mulank 9 first), 2 scores +1.
    expect(l.ranked.map((r) => r.number)).toEqual([9, 1, 3, 2]);
    expect(l.days[0]).toBe("tuesday");
  });
});
