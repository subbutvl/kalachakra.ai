import fc from "fast-check";
import { ruleProfiles, rulesVersions } from "@kalachakra/rules";
import {
  computeBusiness,
  computeCompatibility,
  computeHouse,
  computeMobile,
  computeProfile,
  computeVehicle,
  resolveRules,
  daysInMonth,
  formatDate,
  type PersonInput,
} from "@kalachakra/engine";
import { describe, expect, it } from "vitest";
import { buildReport, library, renderReportHtml, type ReportDocument } from "../src/index.js";

const catalog = { versions: rulesVersions, profiles: ruleProfiles };
const house = resolveRules(catalog, "house-default");
const vp = resolveRules(catalog, "vedicpupil-compat");
const practitioner = resolveRules(catalog, "sample-practitioner");
const AS_OF = "2026-11-20";
const aaravP: PersonInput = { name: "Aarav Mehra", dob: "1991-08-14", gender: "male" };
const myraP: PersonInput = { name: "Myra Kapoor", dob: "2016-03-09", gender: "female" };
const aarav = computeProfile({ person: aaravP, as_of: AS_OF }, house);
const myra = computeProfile({ person: myraP, as_of: AS_OF }, house);

const ids = (d: ReportDocument) => d.sections.map((s) => s.id);
const paragraphs = (d: ReportDocument) =>
  d.sections.flatMap((s) => s.blocks).filter((b): b is Extract<typeof b, { kind: "p" }> => b.kind === "p");

describe("report builder", () => {
  it("builds the core report in section order with meta", () => {
    const d = buildReport({ profile: aarav, library: library("en"), audience: "adult" });
    expect(ids(d)).toEqual([
      "cover", "how_to_read", "summary", "mulank", "bhagyank", "driver_conductor", "planets", "name_number", "name_correction",
      "loshu_grid", "loshu_planes", "missing_repeated", "kua", "core_four", "inner_layers", "planes_chart", "maturity",
      "career_money", "love_family", "health", "this_year", "months", "life_cycles", "ten_years", "lucky", "remedies",
      "appendix", "glossary",
    ]);
    expect(d.sections.map((s) => s.number)).toEqual(d.sections.map((_, i) => i + 1));
    expect(d.meta).toMatchObject({ engine: "0.1.0", rules: "v1.0", texts: "0.1", profile: "house-default", language: "en", audience: "adult" });
    expect(d.file_name).toBe("Kalachakra_Aarav_Mehra_Complete_2026-11-20.pdf");
    expect(d.sections.reduce((s, x) => s + x.pages, 0)).toBeGreaterThanOrEqual(50);
  });

  it("uses the person's numbers", () => {
    const d = buildReport({ profile: aarav, library: library("en"), audience: "adult" });
    const text = paragraphs(d).map((p) => p.text).join("\n");
    expect(text).toContain("Mulank 5 is ruled by Mercury");
    expect(text).toContain("Bhagyank 6 points life toward love");
    expect(text).toContain("28, Trust and Contradiction");
    const blockIds = paragraphs(d).map((p) => p.id);
    expect(blockIds).toContain("driver_conductor.5-6");
    expect(blockIds).toContain("loshu.count.2.missing");
    expect(blockIds).toContain("kua.9");
  });

  it("writes the child edition for parents", () => {
    const d = buildReport({ profile: myra, library: library("en"), audience: "child" });
    expect(d.title).toBe("Your Child's Numerology Report");
    expect(d.sections.find((s) => s.id === "career_money")?.title).toBe("School and learning");
    expect(d.sections.find((s) => s.id === "name_correction")?.title).toBe("Spelling choices");
    expect(paragraphs(d).find((p) => p.id === "mulank.9.work")?.text).toMatch(/^This child is energetic/);
    expect(d.file_name).toContain("_Child_");
  });

  it("builds the Tamil report with Tamil headings and labels", () => {
    const d = buildReport({ profile: aarav, library: library("ta"), audience: "adult" });
    expect(d.title).toBe("உங்கள் முழுமையான எண் கணித அறிக்கை");
    expect(d.sections[3]?.title).toBe("பிறவி எண் (இயக்குநர்)");
    expect(JSON.stringify(d.sections[0]!.blocks)).toContain("புதன்");
    const html = renderReportHtml(d);
    expect(html).toContain('lang="ta"');
    expect(html).toContain("லோ ஷு");
  });

  it("adds the optional modules and add-ons", () => {
    const vpAarav = computeProfile({ person: aaravP, as_of: AS_OF }, vp);
    const partner = computeProfile({ person: { name: "Ishaan Verma", dob: "2003-01-04", gender: "male" }, as_of: AS_OF }, vp);
    const d = buildReport({
      profile: vpAarav,
      library: library("en"),
      audience: "adult",
      modules: {
        mobile: computeMobile({ numbers: ["9876524310", "9123456789"] }, vpAarav, vp),
        vehicle: computeVehicle(["KA 05 MN 1234"], vpAarav, vp),
        house: computeHouse({ flat: "12B", door: "E" }, [vpAarav, partner], vp),
        business: computeBusiness({ names: ["Loomcraft Works", "Aarav Weaves"] }, vpAarav, [partner], vp),
        compatibility: { result: computeCompatibility(vpAarav, myra, "parent_child", vp), partner: myra },
      },
    });
    expect(ids(d).filter((x) => x === "mobile")).toHaveLength(2);
    expect(ids(d)).toEqual(expect.arrayContaining(["vehicle_house", "compatibility", "business"]));
    expect(d.meta.modules).toEqual(["mobile", "vehicle", "house", "business", "compatibility"]);
    const html = renderReportHtml(d);
    expect(html).toContain("loomcraftworks.com");
    expect(html).toContain('aria-label="Element flow"');
    expect(html).toContain('aria-label="Partner triangle"');
  });

  it("renders every visual as SVG and a how-it-was-worked-out line", () => {
    const html = renderReportHtml(buildReport({ profile: aarav, library: library("en"), audience: "adult" }));
    for (const v of ["Lo Shu grid", "Birth chart", "Kua directions", "Nine-year cycle", "Twelve months", "Life cycles", "Next ten years"]) {
      expect(html, v).toContain(`aria-label="${v}"`);
    }
    expect(html).toContain("How this was worked out");
    expect(html).toContain("Numerology describes tendencies, not certainties.");
  });

  it("builds for any person, under every profile, in both languages and editions", () => {
    const date = fc
      .record({ year: fc.integer({ min: 1940, max: 2024 }), month: fc.integer({ min: 1, max: 12 }), day: fc.integer({ min: 1, max: 31 }) })
      .map(({ year, month, day }) => formatDate({ year, month, day: Math.min(day, daysInMonth(year, month)) }));
    const name = fc.array(fc.stringMatching(/^[A-Za-z]{2,9}$/), { minLength: 1, maxLength: 3 }).map((p) => p.join(" "));
    const gender = fc.constantFrom("male", "female", "unspecified") as fc.Arbitrary<"male" | "female" | "unspecified">;
    const lang = fc.constantFrom("en", "ta") as fc.Arbitrary<"en" | "ta">;
    const audience = fc.constantFrom("adult", "child") as fc.Arbitrary<"adult" | "child">;
    fc.assert(
      fc.property(name, date, gender, fc.constantFrom(house, vp, practitioner), lang, audience, (n, dob, g, r, l, a) => {
        const p = computeProfile({ person: { name: n, dob, gender: g }, as_of: AS_OF, options: { name_suggestions: 3 } }, r);
        const d = buildReport({ profile: p, library: library(l), audience: a });
        expect(d.sections.length).toBeGreaterThanOrEqual(26);
        expect(paragraphs(d).every((b) => b.text.length > 0 && !/\{[a-z_]+\}/.test(b.text))).toBe(true);
        expect(renderReportHtml(d).length).toBeGreaterThan(20000);
      }),
      { numRuns: 120 },
    );
  });
});

describe("edit overlay (phase 1 spec 6.2)", () => {
  const base = { profile: aarav, library: library("en"), audience: "adult" as const };

  it("replaces, adds notes, hides and reorders, marking the practitioner's words", () => {
    const d = buildReport({
      ...base,
      overlay: {
        status: "reviewed",
        branding: { name: "Dr. Practitioner", phone: "000", signature: "With blessings" },
        order: ["cover", "how_to_read", "summary", "kua"],
        edits: [
          { section: "mulank", block: "mulank.5.work", action: "replace", text: "My own reading of the work section." },
          { section: "loshu_grid", action: "add_note", text: "Note at the end." },
          { section: "missing_repeated", after: "loshu.count.2.missing", action: "add_note", text: "Try a plant in the south-west." },
          { section: "health", action: "hide" },
          { section: "mulank", block: "mulank.5.mind", action: "hide" },
        ],
      },
    });
    expect(paragraphs(d).find((p) => p.id === "mulank.5.work")).toMatchObject({ source: "practitioner", text: "My own reading of the work section." });
    expect(ids(d)).not.toContain("health");
    expect(ids(d).slice(0, 4)).toEqual(["cover", "how_to_read", "summary", "kua"]);
    expect(paragraphs(d).some((p) => p.id === "mulank.5.mind")).toBe(false);
    const mr = d.sections.find((s) => s.id === "missing_repeated")!.blocks;
    const i = mr.findIndex((b) => b.kind === "p" && b.id === "loshu.count.2.missing");
    expect(mr[i + 1]).toMatchObject({ kind: "p", note: true, source: "practitioner" });
    expect(d.status).toBe("reviewed");
    expect(d.branding?.name).toBe("Dr. Practitioner");
    expect(d.needs_attention).toEqual([]);
    const html = renderReportHtml(d);
    expect(html).toContain("own words");
    expect(html).toContain("Dr. Practitioner");
    expect(html).toContain("With blessings");
  });

  it("lists edits whose block disappeared as needing attention", () => {
    const d = buildReport({
      ...base,
      overlay: {
        edits: [
          { section: "mulank", block: "mulank.9.work", action: "replace", text: "x" },
          { section: "nope", action: "hide" },
          { section: "mulank", after: "nope", action: "add_note", text: "y" },
          { section: "mulank", block: "nope", action: "hide" },
        ],
      },
    });
    expect(d.needs_attention).toHaveLength(4);
  });
});
