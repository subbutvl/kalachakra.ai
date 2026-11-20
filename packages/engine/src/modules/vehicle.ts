import type { ResolvedRules } from "../rules/loader.js";
import type { ProfileResult } from "../schemas/profile.js";
import { EngineError } from "../errors.js";
import { letterValue } from "../core/letters.js";
import { formatChain, reduce } from "../core/reduce.js";
import { withExtras } from "../core/result.js";
import { ownerOf, readDigits, type NumberReading } from "./mobile.js";

export interface VehicleReading {
  input: string;
  registration: string;
  /** Which total is the headline (D17). */
  headline: "full" | "digits_only";
  /** Letters by Chaldean value plus digits at face value. */
  full: NumberReading;
  /** Digits only. */
  digits_only: NumberReading;
  letters: { letter: string; value: number }[];
}

export interface VehicleResult {
  readings: VehicleReading[];
  ranked: { input: string; score: number; verdict: string }[];
  rule_refs: string[];
}

/**
 * Vehicle registrations (rules spec 3.11, D17), e.g. KA 05 MN 1234. Letters
 * are converted with Chaldean values; the flow and digit counts read the
 * digits in order.
 */
export function computeVehicle(
  registrations: string[],
  owner: ProfileResult,
  rules: ResolvedRules,
): VehicleResult {
  if (registrations.length === 0)
    throw new EngineError("invalid_input", "Give at least one registration.", "registrations");
  const o = ownerOf(owner);
  const tables = rules.data.letters;
  const mode = rules.settings["vehicle.letters"];
  const readings = registrations.map((raw, i): VehicleReading => {
    const reg = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!/^[A-Z]{2}\d{1,2}[A-Z]{0,3}\d{1,4}$/.test(reg) && !/^\d{2}BH\d{4}[A-Z]{1,2}$/.test(reg)) {
      throw new EngineError(
        "invalid_input",
        `${raw} is not a known registration format.`,
        `registrations.${i}`,
      );
    }
    const letters = [...reg]
      .filter((c) => /[A-Z]/.test(c))
      .map((c) => ({ letter: c, value: letterValue(tables, "chaldean", c) }));
    const digits = [...reg].filter((c) => /\d/.test(c)).map(Number);
    const letterSum = letters.reduce((s, l) => s + l.value, 0);
    const digitSumv = digits.reduce((s, d) => s + d, 0);
    const full = readDigits(rules, raw, digits, o, letterSum + digitSumv, "vehicle");
    const r = reduce(letterSum + digitSumv);
    full.total = withExtras(r, {
      trace: [
        `Letters ${letters.map((l) => `${l.letter}=${l.value}`).join(" + ")} = ${letterSum}; digits ${digits.join(" + ")} = ${digitSumv}; total ${formatChain(r.chain)}`,
      ],
      rule_refs: ["D17"],
      text_keys: [`vehicle.total.${r.value}`],
    });
    const digitsOnly = readDigits(rules, raw, digits, o, digitSumv, "vehicle");
    return {
      input: raw,
      registration: reg,
      headline: mode === "digits_only" ? "digits_only" : "full",
      full,
      digits_only: digitsOnly,
      letters,
    };
  });
  const ranked = readings
    .map((r) => {
      const h = r.headline === "full" ? r.full : r.digits_only;
      return { input: r.input, score: h.score.value, verdict: h.score.verdict };
    })
    .sort((a, b) => b.score - a.score);
  return { readings, ranked, rule_refs: ["D17"] };
}
