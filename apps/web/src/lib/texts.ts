import enMulank from "@kalachakra/texts/en/mulank.json";
import enPlanets from "@kalachakra/texts/en/planets.json";
import enUi from "@kalachakra/texts/en/ui.json";
import taMulank from "@kalachakra/texts/ta/mulank.json";
import taPlanets from "@kalachakra/texts/ta/planets.json";
import taUi from "@kalachakra/texts/ta/ui.json";
import type { Locale } from "@/i18n/locale";

/**
 * A few blocks from the report's own text library, shown on the screens so
 * the site and the report use the same words in both languages.
 */
type Block = string | { text: string };
type Library = { blocks: Record<string, Block> };

const LIB: Record<Locale, Library[]> = {
  en: [enMulank, enPlanets, enUi] as Library[],
  ta: [taMulank, taPlanets, taUi] as Library[],
};

export function libText(locale: Locale, key: string): string | undefined {
  for (const lib of LIB[locale]) {
    const b = lib.blocks[key];
    if (b !== undefined) return typeof b === "string" ? b : b.text;
  }
  return locale === "ta" ? libText("en", key) : undefined;
}

/** The planet that rules each root number, in the system's order (1 Sun … 9 Mars). */
export const PLANETS = [
  "sun",
  "moon",
  "jupiter",
  "rahu",
  "mercury",
  "venus",
  "ketu",
  "saturn",
  "mars",
] as const;
export type Planet = (typeof PLANETS)[number];

export const PLANET_NAMES: Record<Planet, { en: string; ta: string }> = {
  sun: { en: "Sun", ta: "சூரியன்" },
  moon: { en: "Moon", ta: "சந்திரன்" },
  jupiter: { en: "Jupiter", ta: "குரு" },
  rahu: { en: "Rahu", ta: "ராகு" },
  mercury: { en: "Mercury", ta: "புதன்" },
  venus: { en: "Venus", ta: "சுக்கிரன்" },
  ketu: { en: "Ketu", ta: "கேது" },
  saturn: { en: "Saturn", ta: "சனி" },
  mars: { en: "Mars", ta: "செவ்வாய்" },
};

export const planetOf = (n: number): Planet => PLANETS[(n - 1) % 9]!;

/** The first sentence of a library block. */
export function firstSentence(text: string | undefined): string {
  if (!text) return "";
  const m = /^(.+?[.!?।])(\s|$)/u.exec(text);
  return m ? m[1]! : text;
}
