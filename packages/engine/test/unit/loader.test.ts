import { ruleProfiles } from "@kalachakra/rules";
import { describe, expect, it } from "vitest";
import {
  defaultSettings,
  describeRules,
  EngineError,
  listRuleProfiles,
  parseRuleProfile,
  resolveRules,
  SETTING_KEYS,
  validateRulesVersion,
} from "../../src/index.js";
import { catalog, cloneV1, rules } from "../helpers.js";

function errorOf(fn: () => unknown): EngineError {
  try {
    fn();
  } catch (e) {
    if (e instanceof EngineError) return e;
    throw e;
  }
  throw new Error("expected an EngineError");
}

describe("rules v1.0 data", () => {
  it("validates, with every cross-file check passing", () => {
    expect(() => validateRulesVersion(catalog.versions["v1.0"])).not.toThrow();
  });

  it("defines all 24 decisions and every setting once", () => {
    const { settings, decisionOf } = defaultSettings(rules.house.data);
    expect(Object.keys(rules.house.data.switches.decisions)).toHaveLength(24);
    expect(Object.keys(settings).sort()).toEqual([...SETTING_KEYS].sort());
    expect(decisionOf["loshu.include_mulank"]).toBe("D10");
    expect(decisionOf["loshu.include_kua"]).toBe("D11");
  });

  it("holds the approved defaults", () => {
    const s = rules.house.settings;
    expect(s["loshu.include_mulank"]).toBe("two_digit_days_only");
    expect(s["loshu.include_kua"]).toBe(true);
    expect(s["kua.year_cutoff"]).toBe("lichun");
    expect(s["masters.mode"]).toBe("pythagorean_and_personal_years");
    expect(s["letters.y_vowel"]).toBe("by_sound");
    expect(s["mobile.avoid_pairs"]).toEqual(["18", "24", "28", "44", "46", "48", "68", "88"]);
    expect(s["remedies.enabled_tags"]).not.toContain("gemstone");
  });

  it("has a Lichun instant for every year 1900 to 2100, on 3 to 5 February", () => {
    const { utc } = rules.house.data.kua.lichun;
    expect(Object.keys(utc)).toHaveLength(201);
    for (const at of Object.values(utc)) expect(at).toMatch(/^\d{4}-02-0[345]T/);
    // Published Lichun 2024 is 4 Feb 08:27 UTC; 2025 is 3 Feb 14:10 UTC. Table is within 20 minutes.
    const minutes = (iso: string) => Date.parse(iso) / 60000;
    expect(Math.abs(minutes(utc["2024"]!) - minutes("2024-02-04T08:27Z"))).toBeLessThan(20);
    expect(Math.abs(minutes(utc["2025"]!) - minutes("2025-02-03T14:10Z"))).toBeLessThan(20);
  });
});

describe("validateRulesVersion rejects broken data", () => {
  it("names a missing or unknown file", () => {
    const v = cloneV1();
    delete v.kua;
    v.extra = {};
    const e = errorOf(() => validateRulesVersion(v));
    expect(e.code).toBe("invalid_rules");
    expect(e.message).toMatch(/kua\.json is missing/);
    expect(e.message).toMatch(/extra\.json is not a known rules file/);
    expect(() => validateRulesVersion(null)).toThrow(/must be an object/);
  });

  it("reports schema errors with their path", () => {
    const v = cloneV1() as any;
    v.letters.chaldean.A = 9;
    delete v.planets.friendship.mars;
    const m = errorOf(() => validateRulesVersion(v)).message;
    expect(m).toMatch(/letters\.chaldean\.A/);
    expect(m).toMatch(/planets\.friendship\.mars/);
  });

  it("catches cross-file problems", () => {
    const v = cloneV1() as any;
    delete v.letters.pythagorean.Z;
    v.letters.planes_of_expression.physical.push("A");
    v.planets.numbers["9"] = "sun";
    v.planets.friendship.moon.neutral.pop();
    delete v.planets.days.venus;
    delete v.compounds.compounds["30"];
    v.compounds.compounds["33"] = { read_like: 40 };
    v.loshu.layout[0][0] = 5;
    delete v.loshu.directions["9"];
    v.kua.groups.east = [1, 3, 4];
    v.kua.directions["1"].success = "E";
    delete v.kua.directions["2"];
    delete v.kua.lichun.utc["1950"];
    delete v.switches.decisions.D24;
    v.switches.decisions.D23.settings["loshu.include_kua"] = false;
    const m = errorOf(() => validateRulesVersion(v)).message;
    for (const expected of [
      "letters.pythagorean must cover A to Z exactly (missing: Z)",
      "letters.planes_of_expression must place every letter",
      "planets.numbers must map 1 to 9",
      "planets.friendship.moon must list each",
      "planets.days.venus is missing",
      "compounds.30 is missing",
      "compounds.33.read_like must point",
      "loshu.layout must use 1 to 9",
      "loshu.directions must cover 1 to 9",
      "kua.groups must split",
      "kua.directions.1 must use each",
      "kua.directions.2 is missing",
      "kua.lichun.utc.1950 is missing",
      "switches.decisions must hold D1 to D24 (found 23)",
      'setting "business.domain_count" must be defined by exactly one decision (found 0)',
      'setting "loshu.include_kua" must be defined by exactly one decision (found 2)',
    ]) {
      expect(m).toContain(expected);
    }
  });
});

describe("rule profiles (phase 1 spec 4.4)", () => {
  it("ships three profiles that all validate", () => {
    const list = listRuleProfiles(catalog);
    expect(list.map((p) => p.id)).toEqual([
      "house-default",
      "vedicpupil-compat",
      "sample-practitioner",
    ]);
    expect(list[0]).toMatchObject({ base: "v1.0", overrides: 0 });
    for (const p of Object.values(ruleProfiles)) expect(() => parseRuleProfile(p)).not.toThrow();
  });

  it("merges overrides and records each setting's source", () => {
    const vp = rules.vedicpupil;
    expect(vp.rulesVersion).toBe("v1.0");
    expect(vp.profile.id).toBe("vedicpupil-compat");
    expect(vp.settings["loshu.include_mulank"]).toBe("always");
    expect(vp.sources["loshu.include_mulank"]).toEqual({
      decision: "D10",
      source: "profile",
      default: "two_digit_days_only",
    });
    expect(vp.sources["date.day_boundary"].source).toBe("default");
  });

  it("describes every setting in D1 to D24 order", () => {
    const d = describeRules(rules.practitioner);
    expect(d).toHaveLength(SETTING_KEYS.length);
    expect(d[0]).toMatchObject({
      decision: "D1",
      key: "names.analysed",
      title: "Which name is analysed",
    });
    expect(d.at(-1)?.decision).toBe("D24");
    expect(d.filter((x) => x.source === "profile").map((x) => x.key)).toEqual([
      "masters.mode",
      "letters.y_vowel",
      "loshu.include_mulank",
      "kua.year_cutoff",
      "remedies.enabled_tags",
    ]);
  });

  it("accepts an inline custom profile (practitioner mode)", () => {
    const r = resolveRules(catalog, {
      id: "custom",
      name: "Custom",
      base: "v1.0",
      overrides: {
        "loshu.include_mulank": "never",
        "compatibility.weights": {
          driver_harmony: 30,
          conductor_harmony: 10,
          cross_harmony: 10,
          loshu_gap_filling: 20,
          life_path_synergy: 15,
          name_harmony: 10,
          kua_group: 5,
        },
      },
    });
    expect(r.settings["loshu.include_mulank"]).toBe("never");
    expect(r.profile).toEqual({ id: "custom", name: "Custom", base: "v1.0" });
  });

  it("rejects unknown profiles, versions and settings", () => {
    expect(errorOf(() => resolveRules(catalog, "nope"))).toMatchObject({
      code: "unknown_profile",
      field: "rule_profile",
    });
    expect(
      errorOf(() => resolveRules(catalog, { id: "x", name: "X", base: "v9.9", overrides: {} })),
    ).toMatchObject({ code: "unknown_rules_version", field: "rule_profile.base" });

    const unknown = errorOf(() =>
      resolveRules(catalog, {
        id: "x",
        name: "X",
        base: "v1.0",
        overrides: { "loshu.add_everything": true },
      }),
    );
    expect(unknown).toMatchObject({
      code: "unknown_setting",
      field: "rule_profile.overrides.loshu.add_everything",
    });

    const bad = errorOf(() =>
      resolveRules(catalog, {
        id: "x",
        name: "X",
        base: "v1.0",
        overrides: { "loshu.include_mulank": "sometimes" },
      }),
    );
    expect(bad.code).toBe("invalid_setting");
    expect(bad.field).toBe("rule_profile.overrides.loshu.include_mulank");

    expect(
      errorOf(() => resolveRules(catalog, { id: "Bad Id", name: "X", base: "v1.0", overrides: {} }))
        .code,
    ).toBe("invalid_profile");
  });

  it("validates a rules version once and reuses it", () => {
    const a = resolveRules(catalog, "house-default");
    const b = resolveRules(catalog, "sample-practitioner");
    expect(a.data).toBe(b.data);
  });
});
