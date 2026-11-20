import type { ResolvedRules } from "../rules/loader.js";
import type { CalendarDate } from "../core/dates.js";
import { digitsOf } from "./dateNumbers.js";

export type LoshuSource = "dob" | "mulank" | "bhagyank" | "kua";
export type CountBand = "missing" | "single" | "double" | "triple" | "four_plus";
export type PlaneState = "complete" | "partial" | "empty";

export interface LoshuCell {
  count: number;
  band: CountBand;
  /** Where each copy of the number came from, in order. */
  sources: LoshuSource[];
  direction: string;
  element: string;
  text_keys: string[];
}

export interface LoshuRemedy {
  number: number;
  direction: string;
  element: string;
  colours: string[];
  /** Remedy tags switched on by D19, each with its text key. */
  tags: { tag: string; text_key: string }[];
}

export interface LoshuGrid {
  layout: number[][];
  cells: Record<string, LoshuCell>;
  inputs: { value: number; source: LoshuSource }[];
  missing: number[];
  repeated: number[];
  planes: Record<string, { numbers: number[]; present: number; state: PlaneState; text_key: string }>;
  remedies: LoshuRemedy[];
  elements: Record<string, number>;
  trace: string[];
  rule_refs: string[];
}

function bandOf(count: number): CountBand {
  return count === 0 ? "missing" : count === 1 ? "single" : count === 2 ? "double" : count === 3 ? "triple" : "four_plus";
}

/**
 * Lo Shu grid (rules spec 3.7). Inputs: every non-zero digit of the date,
 * the Bhagyank, the Mulank only when the day has two digits (D10), and the
 * Kua as a marked cell (D11).
 */
export function loshu(
  rules: ResolvedRules,
  date: CalendarDate,
  mulank: number,
  bhagyank: number,
  kua: number | null,
): LoshuGrid {
  const data = rules.data.loshu;
  const inputs: LoshuGrid["inputs"] = digitsOf(date)
    .filter((d) => d > 0)
    .map((value) => ({ value, source: "dob" as const }));
  const trace = [`Date digits without zeros: ${inputs.map((i) => i.value).join(", ")}`];

  inputs.push({ value: bhagyank, source: "bhagyank" });
  trace.push(`Bhagyank added: ${bhagyank}`);

  const mode = rules.settings["loshu.include_mulank"];
  const addMulank = mode === "always" || (mode === "two_digit_days_only" && date.day >= 10);
  if (addMulank) {
    inputs.push({ value: mulank, source: "mulank" });
    trace.push(`Mulank added: ${mulank}${mode === "two_digit_days_only" ? ` (day ${date.day} has two digits)` : ""}`);
  } else {
    trace.push(
      mode === "never" ? "Mulank not added (switched off)" : `Mulank not added: day ${date.day} has one digit, so ${mulank} is already counted`,
    );
  }

  if (rules.settings["loshu.include_kua"] && kua !== null) {
    inputs.push({ value: kua, source: "kua" });
    trace.push(`Kua added as a marked cell: ${kua}`);
  }

  const cells: Record<string, LoshuCell> = {};
  for (let n = 1; n <= 9; n++) {
    const mine = inputs.filter((i) => i.value === n);
    const band = bandOf(mine.length);
    cells[String(n)] = {
      count: mine.length,
      band,
      sources: mine.map((i) => i.source),
      direction: data.directions[String(n)]!,
      element: data.elements[String(n)]!,
      text_keys: [`loshu.count.${n}.${band}`],
    };
  }
  const missing = Object.entries(cells).filter(([, c]) => c.count === 0).map(([n]) => Number(n));
  const repeated = Object.entries(cells).filter(([, c]) => c.count > 1).map(([n]) => Number(n));

  const planes: LoshuGrid["planes"] = {};
  for (const [name, numbers] of Object.entries(data.planes)) {
    const present = numbers.filter((n) => (cells[String(n)]?.count ?? 0) > 0).length;
    const state: PlaneState = present === 3 ? "complete" : present === 0 ? "empty" : "partial";
    planes[name] = { numbers, present, state, text_key: `loshu.plane.${name}.${state}` };
  }

  const enabled = rules.settings["remedies.enabled_tags"];
  const remedyTags = data.remedy_tags.filter((t) => enabled.includes(t));
  const remedies = missing.map((n): LoshuRemedy => {
    const element = data.elements[String(n)]!;
    return {
      number: n,
      direction: data.directions[String(n)]!,
      element,
      colours: data.element_colours[element as "water"] ?? [],
      tags: remedyTags.map((tag) => ({ tag, text_key: `loshu.remedy.${n}.${tag}` })),
    };
  });

  const elements: Record<string, number> = {};
  for (const i of inputs) {
    const e = data.elements[String(i.value)]!;
    elements[e] = (elements[e] ?? 0) + 1;
  }

  trace.push(`Missing: ${missing.join(", ") || "none"}`);
  return {
    layout: data.layout,
    cells,
    inputs,
    missing,
    repeated,
    planes,
    remedies,
    elements,
    trace,
    rule_refs: ["D10", "D11", "D19"],
  };
}
