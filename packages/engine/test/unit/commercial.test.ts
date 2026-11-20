import { describe, expect, it } from "vitest";
import {
  computeBusiness,
  computeCompatibility,
  computeHouse,
  computeMobile,
  computeProfile,
  computeVehicle,
  countBusinessName,
  elementFlow,
  EngineError,
  findDates,
  generateVariants,
  lifePathKind,
  nationalNumber,
  readable,
  resolveRules,
  suggestNames,
  type PersonInput,
  type ResolvedRules,
} from "../../src/index.js";
import { catalog, rules } from "../helpers.js";

const AS_OF = "2026-11-20";
const profile = (person: PersonInput, r: ResolvedRules = rules.house) => computeProfile({ person, as_of: AS_OF }, r);
const aarav = profile({ name: "Aarav Mehra", dob: "1991-08-14", gender: "male" });
const myra = profile({ name: "Myra Kapoor", dob: "2016-03-09", gender: "female" });
const custom = (overrides: Record<string, unknown>) =>
  resolveRules(catalog, { id: "custom", name: "Custom", base: "v1.0", overrides });
const err = (fn: () => unknown) => {
  try {
    fn();
  } catch (e) {
    return e as EngineError;
  }
  throw new Error("no error");
};

describe("name optimiser (rules spec 3.10)", () => {
  it("generates the benchmark's spelling ideas", () => {
    const names = generateVariants("Myra", 1, true, 2000).map((v) => v.name);
    expect(names).toEqual(expect.arrayContaining(["MYRRA", "MYRAA", "MIRA"]));
    expect(generateVariants("Aarav", 1, true, 2000).map((v) => v.name)).toContain("AARAVE");
  });

  it("never touches the first letter, respects the edit limit and the readability check (D15)", () => {
    for (const v of generateVariants("Kavya Iyer", 2, true, 2000)) {
      const words = v.name.split(" ");
      expect(words[0]![0]).toBe("K");
      expect(words[1]![0]).toBe("I");
      expect(v.edits.length).toBeLessThanOrEqual(2);
      expect(readable(v.name)).toBe(true);
    }
    expect(generateVariants("Kavya", 1, false, 2000).map((v) => v.name)).toContain("CAVYA");
    expect(generateVariants("Aarav Mehra", 2, true, 5)).toHaveLength(5);
    expect(readable("AAARAV")).toBe(false);
    expect(readable("ASHWIN")).toBe(true);
    expect(readable("ASHTRA")).toBe(false);
    expect(readable("ASHTRRA")).toBe(false);
  });

  it("covers the silent H, K to C and ending rules", () => {
    const edits = ["Rohit", "Bharat", "Makunda", "Kapila"].flatMap((n) => generateVariants(n, 1, true, 2000).flatMap((v) => v.edits));
    expect(edits).toEqual(expect.arrayContaining(["drop silent H", "add H after T", "K to C", "ending A to AA", "I to Y"]));
    expect(generateVariants("Divyaa", 1, true, 2000).flatMap((v) => v.edits)).toContain("ending AA to A");
    expect(generateVariants("Myra", 1, true, 2000).flatMap((v) => v.edits)).toContain("Y to I");
  });

  it("ranks spellings out of 100 with a reason and where to use them", () => {
    const s = suggestNames(rules.house, "Aarav Mehra", 5, 6);
    expect(s.current.edits).toEqual([]);
    expect(s.suggestions).toHaveLength(5);
    expect(s.suggestions[0]!.score).toBeGreaterThan(s.current.score);
    for (const x of s.suggestions) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(100);
      expect(x.reason).toMatch(/→/);
    }
    expect(s.forms.social_profile).toBe(s.forms.signature.split(" ")[0]);
    const three = suggestNames(rules.house, "Aarav Kumar Mehra", 5, 6, 3);
    expect(three.forms.business_card.split(" ")).toHaveLength(2);
    // Without a better spelling the current one is kept for every form.
    const none = suggestNames(custom({ "optimizer.max_edits": 1 }), "Q", 5, 6);
    expect(none.forms.signature).toBe(none.current.score >= (none.suggestions[0]?.score ?? 0) ? "Q" : none.suggestions[0]!.name);
  });

  it("is part of the profile unless switched off", () => {
    expect(aarav.name_optimizer?.suggestions).toHaveLength(5);
    const off = computeProfile({ person: { name: "Aarav Mehra", dob: "1991-08-14", gender: "male" }, as_of: AS_OF, options: { name_suggestions: 0 } }, rules.house);
    expect(off.name_optimizer).toBeUndefined();
  });
});

describe("mobile (rules spec 3.11)", () => {
  it("normalises national numbers", () => {
    expect(nationalNumber(rules.house, "+91 98765-24310")).toBe("9876524310");
    expect(nationalNumber(rules.house, "0091 9876524310")).toBe("9876524310");
    expect(nationalNumber(rules.house, "09876524310")).toBe("9876524310");
    expect(err(() => nationalNumber(rules.house, "12345"))).toMatchObject({ code: "invalid_input" });
  });

  it("reads zeros as a pause, ignores them or amplifies (D16)", () => {
    const d = [3, 1, 0, 8];
    expect(elementFlow(rules.house, d).map((p) => p.kind)).toEqual(["smooth", "pause", "pause"]);
    expect(elementFlow(custom({ "mobile.zero_mode": "ignore" }), d).map((p) => `${p.pair}:${p.kind}`)).toEqual(["31:smooth", "18:clash"]);
    expect(elementFlow(custom({ "mobile.zero_mode": "amplifier" }), d)[1]!.kind).toBe("amplifier");
  });

  it("counts avoid-list pairs as clashes (D21)", () => {
    expect(elementFlow(rules.house, [1, 8]).map((p) => p.kind)).toEqual(["clash"]);
    expect(elementFlow(custom({ "mobile.avoid_pairs": [] }), [1, 8])[0]!.kind).toBe("neutral");
  });

  it("scores, ranks up to 20 numbers and reads the last 4", () => {
    const m = computeMobile({ numbers: ["9876524310", "9123456789", "9999999999"] }, aarav, rules.house);
    expect(m.ranked).toHaveLength(3);
    expect(m.ranked[0]!.score).toBeGreaterThanOrEqual(m.ranked[2]!.score);
    const r0 = m.readings[0]!;
    expect(r0.last4).toMatchObject({ digits: "4310" });
    expect(r0.last4.total.value).toBe(8);
    expect(r0.last4.pairs).toHaveLength(3);
    expect(r0.counts.zeros).toBe(1);
    expect(r0.counts.repeated).toEqual({});
    expect(m.readings[2]!.counts.repeated).toEqual({ "9": 10 });
    expect(["keep", "keep_with_notes", "consider_second_number"]).toContain(r0.score.verdict);
    expect(err(() => computeMobile({ numbers: [] }, aarav, rules.house))).toMatchObject({ field: "numbers" });
    expect(err(() => computeMobile({ numbers: ["9876524310"], goals: ["fame"] }, aarav, rules.house))).toMatchObject({ field: "goals" });
  });

  it("follows the reading model (D20)", () => {
    expect(computeMobile({ numbers: ["9876524310"] }, aarav, custom({ "mobile.reading_model": "classic" })).readings[0]!.flow).toBeUndefined();
    const ef = computeMobile({ numbers: ["9876524310"] }, aarav, custom({ "mobile.reading_model": "element_flow" })).readings[0]!;
    expect(ef.score.components.fit).toBeUndefined();
    expect(ef.flow).toBeDefined();
  });

  it("finds endings for a 6-digit prefix", () => {
    const m = computeMobile({ numbers: ["9876524310"], find_for: "987652", max_candidates: 3 }, aarav, rules.house);
    expect(m.candidates?.endings).toHaveLength(3);
  });
});

describe("vehicle and house (rules spec 3.11)", () => {
  it("converts registration letters by Chaldean and shows digits only too (D17)", () => {
    const v = computeVehicle(["KA 05 MN 1234", "MH12AB1"], aarav, rules.house);
    const r = v.readings[0]!;
    expect(r.registration).toBe("KA05MN1234");
    // K2 A1 M4 N5 = 12; digits 0+5+1+2+3+4 = 15; total 27 → 9.
    expect(r.full.total.chain).toEqual([27, 9]);
    expect(r.digits_only.total.chain).toEqual([15, 6]);
    expect(r.headline).toBe("full");
    expect(v.ranked).toHaveLength(2);
    expect(computeVehicle(["KA05MN1234"], aarav, custom({ "vehicle.letters": "digits_only" })).readings[0]!.headline).toBe("digits_only");
    expect(err(() => computeVehicle(["HELLO"], aarav, rules.house))).toMatchObject({ code: "invalid_input" });
    expect(err(() => computeVehicle([], aarav, rules.house))).toMatchObject({ code: "invalid_input" });
  });

  it("scores flat then building for every resident and checks the door against Kua", () => {
    const h = computeHouse({ flat: "12B", building: "45", door: "E" }, [aarav, myra], rules.house);
    // 1 + 2 + B=2 = 5.
    expect(h.numbers[0]!.number.chain).toEqual([5]);
    expect(h.numbers[1]!.number.chain).toEqual([9]);
    expect(h.numbers[0]!.residents[0]).toEqual({ name: "Aarav Mehra", mulank: 2, bhagyank: 2, total: 4 });
    // Aarav's Kua 9: east is success; Myra's Kua 4: east is relationships.
    expect(h.door?.residents).toEqual([
      { name: "Aarav Mehra", kua: 9, kind: "success", good: true },
      { name: "Myra Kapoor", kua: 4, kind: "relationships", good: true },
    ]);
    const noKua = profile({ name: "Sam", dob: "2000-01-01", gender: "unspecified" });
    expect(computeHouse({ flat: "7", door: "N" }, [noKua], rules.house).door?.residents[0]).toMatchObject({ kua: null, good: null });
    expect(err(() => computeHouse({}, [aarav], rules.house))).toMatchObject({ field: "flat" });
    expect(err(() => computeHouse({ flat: "12-C/4" }, [aarav], rules.house))).toMatchObject({ code: "invalid_input" });
    expect(err(() => computeHouse({ flat: "1" }, [], rules.house))).toMatchObject({ field: "residents" });
  });
});

describe("business (rules spec 3.5a)", () => {
  it("counts digits at face value and handles & (D22)", () => {
    expect(countBusinessName(rules.house, "3M Works").total).toBe(3 + 4 + 20);
    expect(countBusinessName(rules.house, "A & B").total).toBe(3);
    expect(countBusinessName(custom({ "business.ampersand": "as_and" }), "A & B").total).toBe(1 + 1 + 5 + 4 + 2);
    expect(err(() => countBusinessName(rules.house, "&&"))).toMatchObject({ code: "invalid_input" });
  });

  it("can count the suffix in the headline", () => {
    const b = computeBusiness({ names: ["Mehra Textiles Pvt. Ltd."] }, aarav, [], custom({ "business.legal_suffix": "include" }));
    expect(b.names[0]!.counted.total).toBe(76);
    expect(b.names[0]!.other_version).toMatchObject({ kind: "without_suffix", total: 47 });
  });

  it("scores the trade, compound class and incorporation date (D8, D23)", () => {
    const trade = computeBusiness({ names: ["Loomcraft Works"], trade: "trade_media", incorporation_date: "2020-05-14" }, aarav, [], rules.house);
    const n = trade.names[0]!;
    expect(n.bonus).toEqual({ kind: "trade", value: 1 });
    expect(n.compound_class).toBe(0); // 14 is mixed
    expect(n.incorporation?.bhagyank).toBe(5); // 1+4+0+5+2+0+2+0 = 14 → 5
    expect(n.total).toBe(5 + 1 + 0 + n.incorporation!.score);
    expect(computeBusiness({ names: ["Loomcraft Works"] }, aarav, [], custom({ "business.bonus": "none" })).names[0]!.bonus).toEqual({ kind: "none", value: 0 });
    expect(err(() => computeBusiness({ names: ["X"], trade: "magic" }, aarav, [], rules.house))).toMatchObject({ field: "trade" });
    expect(err(() => computeBusiness({ names: [] }, aarav, [], rules.house))).toMatchObject({ field: "names" });
    expect(err(() => computeBusiness({ names: ["X"] }, aarav, [myra, myra, myra, myra], rules.house))).toMatchObject({ field: "partners" });
  });

  it("can count domains by name only (D24) and builds the partner triangle", () => {
    const b = computeBusiness({ names: ["Loomcraft Works"] }, aarav, [myra], custom({ "business.domain_count": "name_only" }));
    expect(b.domains[0]!.headline).toBe("name_only");
    expect(b.domains[0]!.name_only.chain[0]).toBe(59);
    expect(b.domains.map((d) => d.extension)).toEqual([".com", ".in", ".co", ".co.in"]);
    expect(b.partner_triangle.map((p) => p.role)).toEqual(["owner", "partner"]);
  });
});

describe("compatibility (rules spec 3.12)", () => {
  it("scores out of 100 with every component", () => {
    const c = computeCompatibility(aarav, myra, "parent_child", rules.house);
    expect(c.components.map((x) => x.id)).toEqual([
      "driver_harmony",
      "conductor_harmony",
      "cross_harmony",
      "loshu_gap_filling",
      "life_path_synergy",
      "name_harmony",
      "kua_group",
    ]);
    const points = c.components.reduce((s, x) => s + x.share * x.weight, 0);
    expect(c.score).toBe(Math.round(points));
    expect(c.score).toBeGreaterThanOrEqual(0);
    expect(c.score).toBeLessThanOrEqual(100);
    // Mulank 5 and 9: Mercury–Mars −1 → 25%.
    expect(c.components[0]!.share).toBe(0.25);
    // Both Kua in the east group.
    expect(c.components[6]!.share).toBe(1);
    expect(c.combined_loshu.shared_gaps).toEqual([7]);
    expect(c.timeline).toHaveLength(10);
    expect(["excellent", "good", "workable", "needs_effort"]).toContain(c.band);
  });

  it("is symmetric and takes custom weights (D18)", () => {
    expect(computeCompatibility(aarav, myra, "couple", rules.house).score).toBe(computeCompatibility(myra, aarav, "couple", rules.house).score);
    const w = { driver_harmony: 100, conductor_harmony: 0, cross_harmony: 0, loshu_gap_filling: 0, life_path_synergy: 0, name_harmony: 0, kua_group: 0 };
    expect(computeCompatibility(aarav, myra, "couple", custom({ "compatibility.weights": w })).score).toBe(25);
    expect(err(() => computeCompatibility(aarav, myra, "rivals" as "couple", rules.house))).toMatchObject({ field: "relationship" });
  });

  it("reads the life path table symmetrically", () => {
    expect(lifePathKind(rules.house, 1, 5)).toBe("natural");
    expect(lifePathKind(rules.house, 3, 1)).toBe("compatible");
    expect(lifePathKind(rules.house, 1, 4)).toBe("challenging");
  });
});

describe("favourable dates", () => {
  it("ranks dates in a range for a purpose", () => {
    const d = findDates({ from: "2026-12-01", to: "2026-12-31", purpose: "launch" }, [aarav], rules.house);
    expect(d.checked).toBe(31);
    expect(d.dates).toHaveLength(10);
    for (let i = 1; i < d.dates.length; i++) expect(d.dates[i - 1]!.score).toBeGreaterThanOrEqual(d.dates[i]!.score);
    expect(d.dates[0]!.people[0]!.reasons.length).toBeGreaterThan(0);
    const two = findDates({ from: "2026-12-01", to: "2026-12-07", purpose: "signing", top_n: 3 }, [aarav, myra], rules.house);
    expect(two.dates[0]!.people).toHaveLength(2);
    expect(two.dates).toHaveLength(3);
  });

  it("checks its input", () => {
    expect(err(() => findDates({ from: "2026-12-01", to: "2026-12-31", purpose: "wedding" }, [aarav], rules.house))).toMatchObject({ field: "purpose" });
    expect(err(() => findDates({ from: "2026-12-31", to: "2026-12-01", purpose: "move" }, [aarav], rules.house))).toMatchObject({ field: "to" });
    expect(err(() => findDates({ from: "2026-01-01", to: "2028-01-01", purpose: "move" }, [aarav], rules.house))).toMatchObject({ field: "to" });
    expect(err(() => findDates({ from: "2026-01-01", to: "2026-01-02", purpose: "move" }, [], rules.house))).toMatchObject({ field: "profiles" });
  });
});
