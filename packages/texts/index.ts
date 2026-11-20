// @kalachakra/texts: interpretation library DATA only. The report builder
// validates and assembles it (packages/report/src/texts.ts).

import enBhagyank from "./en/bhagyank.json" with { type: "json" };
import enBusiness from "./en/business.json" with { type: "json" };
import enCompatibility from "./en/compatibility.json" with { type: "json" };
import enCompounds from "./en/compounds.json" with { type: "json" };
import enDaily from "./en/daily.json" with { type: "json" };
import enDriverConductor from "./en/driver_conductor.json" with { type: "json" };
import enKua from "./en/kua.json" with { type: "json" };
import enLife from "./en/life.json" with { type: "json" };
import enLoshu from "./en/loshu.json" with { type: "json" };
import enMulank from "./en/mulank.json" with { type: "json" };
import enName from "./en/name.json" with { type: "json" };
import enPlanets from "./en/planets.json" with { type: "json" };
import enPythagorean from "./en/pythagorean.json" with { type: "json" };
import enSummary from "./en/summary.json" with { type: "json" };
import enTiming from "./en/timing.json" with { type: "json" };
import enUi from "./en/ui.json" with { type: "json" };

import taBhagyank from "./ta/bhagyank.json" with { type: "json" };
import taBusiness from "./ta/business.json" with { type: "json" };
import taCompatibility from "./ta/compatibility.json" with { type: "json" };
import taCompounds from "./ta/compounds.json" with { type: "json" };
import taDaily from "./ta/daily.json" with { type: "json" };
import taDriverConductor from "./ta/driver_conductor.json" with { type: "json" };
import taKua from "./ta/kua.json" with { type: "json" };
import taLife from "./ta/life.json" with { type: "json" };
import taLoshu from "./ta/loshu.json" with { type: "json" };
import taMulank from "./ta/mulank.json" with { type: "json" };
import taName from "./ta/name.json" with { type: "json" };
import taPlanets from "./ta/planets.json" with { type: "json" };
import taPythagorean from "./ta/pythagorean.json" with { type: "json" };
import taSummary from "./ta/summary.json" with { type: "json" };
import taTiming from "./ta/timing.json" with { type: "json" };
import taUi from "./ta/ui.json" with { type: "json" };

/** The text library version recorded in every report (phase 1 spec 4.6). */
export const TEXTS_VERSION = "0.1";

/** Raw, unvalidated text files per language, keyed by module. */
export const textFiles: Record<string, Record<string, unknown>> = {
  en: {
    bhagyank: enBhagyank,
    business: enBusiness,
    compatibility: enCompatibility,
    compounds: enCompounds,
    daily: enDaily,
    driver_conductor: enDriverConductor,
    kua: enKua,
    life: enLife,
    loshu: enLoshu,
    mulank: enMulank,
    name: enName,
    planets: enPlanets,
    pythagorean: enPythagorean,
    summary: enSummary,
    timing: enTiming,
    ui: enUi,
  },
  ta: {
    bhagyank: taBhagyank,
    business: taBusiness,
    compatibility: taCompatibility,
    compounds: taCompounds,
    daily: taDaily,
    driver_conductor: taDriverConductor,
    kua: taKua,
    life: taLife,
    loshu: taLoshu,
    mulank: taMulank,
    name: taName,
    planets: taPlanets,
    pythagorean: taPythagorean,
    summary: taSummary,
    timing: taTiming,
    ui: taUi,
  },
};
