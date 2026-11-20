import { ruleProfiles, rulesVersions } from "@kalachakra/rules";
import { computeProfile, resolveRules } from "@kalachakra/engine";
import { afterAll, describe, expect, it } from "vitest";
import { buildReport, library } from "../src/index.js";
import { closePdfBrowser, renderReportPdf } from "../src/pdf.js";

const rules = resolveRules({ versions: rulesVersions, profiles: ruleProfiles }, "house-default");
const profile = computeProfile(
  { person: { name: "Aarav Mehra", dob: "1991-08-14", gender: "male" }, as_of: "2026-11-20" },
  rules,
);
const pages = (pdf: Uint8Array) =>
  (
    Buffer.from(pdf)
      .toString("latin1")
      .match(/\/Type\s*\/Page[^s]/g) ?? []
  ).length;

afterAll(async () => {
  await closePdfBrowser();
});

describe("PDF (phase 1 spec 8)", () => {
  for (const language of ["en", "ta"] as const) {
    it(`renders an A4 ${language} report with embedded fonts, in under 10 seconds`, async () => {
      const doc = buildReport({ profile, library: library(language), audience: "adult" });
      const t0 = performance.now();
      const pdf = await renderReportPdf(doc);
      const ms = performance.now() - t0;
      const raw = Buffer.from(pdf).toString("latin1");
      expect(raw.startsWith("%PDF-")).toBe(true);
      // Text stays selectable: fonts are embedded, not rasterised.
      expect(raw).toMatch(/\/FontFile2|\/FontFile3/);
      // Phase 1 text library v0.1 gives about 33 pages; the 56-page target needs the fuller library (see the M5 PR).
      expect(pages(pdf)).toBeGreaterThanOrEqual(28);
      expect(ms).toBeLessThan(10_000);
    });
  }
});
