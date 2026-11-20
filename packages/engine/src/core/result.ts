import type { Flag, NumberResult } from "../schemas/common.js";
import { formatChain, isMaster, reduce } from "./reduce.js";

export interface ResultExtras {
  trace?: string[];
  rule_refs?: string[];
  text_keys?: string[];
  flags?: Flag[];
  compound?: number;
}

/** Builds a NumberResult from a reduction, adding its working and references. Empty lists are left out. */
export function withExtras(base: NumberResult, extras: ResultExtras = {}): NumberResult {
  const out: NumberResult = { ...base };
  const flags = new Set<Flag>(extras.flags ?? []);
  if (base.master !== undefined) flags.add("master");
  if (extras.compound !== undefined) out.compound = extras.compound;
  if (extras.trace?.length) out.trace = extras.trace;
  if (extras.rule_refs?.length) out.rule_refs = [...new Set(extras.rule_refs)];
  if (extras.text_keys?.length) out.text_keys = [...new Set(extras.text_keys)];
  if (flags.size) out.flags = [...flags];
  return out;
}

/** "1+4+0+8+1+9+9+1 = 33 → 6": the sum, then the rest of the chain. */
export function sumTrace(terms: readonly (number | string)[], result: NumberResult): string {
  const tail = result.chain.length > 1 ? ` → ${formatChain(result.chain.slice(1))}` : "";
  return `${terms.join(" + ")} = ${result.chain[0]}${tail}`;
}

/** Text key for a number, using the kept master when there is one: "bhagyank.33" or "bhagyank.6". */
export function numberKey(prefix: string, r: NumberResult): string {
  return `${prefix}.${r.value}`;
}

export const KARMIC_DEBT = [13, 14, 16, 19] as const;

/** Karmic debt numbers (13, 14, 16, 19) met anywhere in a reduction chain. */
export function karmicDebtIn(chain: readonly number[]): number[] {
  return chain.filter((n) => (KARMIC_DEBT as readonly number[]).includes(n));
}

/** Reduces with or without masters and returns the digit used for planets and grids. */
export function digitOf(r: NumberResult): number {
  return r.reduced;
}

export { reduce, isMaster };
