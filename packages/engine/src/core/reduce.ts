import { MASTER_NUMBERS, type MasterNumber, type NumberResult } from "../schemas/common.js";
import { EngineError } from "../errors.js";

/** Sum of the decimal digits of a non-negative integer. */
export function digitSum(n: number): number {
  assertNonNegativeInt(n);
  let sum = 0;
  let rest = n;
  while (rest > 0) {
    sum += rest % 10;
    rest = Math.floor(rest / 10);
  }
  return sum;
}

export function isMaster(n: number): n is MasterNumber {
  return (MASTER_NUMBERS as readonly number[]).includes(n);
}

export interface ReduceOptions {
  /** Stop at 11, 22 or 33 instead of reducing to one digit (rules spec 3.1, D3). */
  keepMasters?: boolean;
}

/**
 * Reduces a number by summing its digits until one digit is left, keeping the
 * full chain so the report can show its working (rules spec 3.1).
 *
 *   reduce(28)                      → value 1,  chain [28, 10, 1]
 *   reduce(33)                      → value 6,  chain [33, 6], master 33
 *   reduce(29, { keepMasters })     → value 11, chain [29, 11], reduced 2, master 11
 *
 * 0 stays 0 (used by challenges). `master` is the first master number met in
 * the chain, whether or not it was kept, so a dropped master can still be flagged.
 */
export function reduce(n: number, options: ReduceOptions = {}): NumberResult {
  assertNonNegativeInt(n);
  const chain = [n];
  let master: MasterNumber | undefined = isMaster(n) ? n : undefined;
  let value = n;
  while (value > 9 && !(options.keepMasters && isMaster(value))) {
    value = digitSum(value);
    chain.push(value);
    if (master === undefined && isMaster(value)) master = value;
  }
  let reduced = value;
  while (reduced > 9) reduced = digitSum(reduced);
  return master === undefined ? { value, chain, reduced } : { value, chain, reduced, master };
}

/** reduce() that keeps masters; shorthand for the spec's reduceKeepMaster(n). */
export function reduceKeepMaster(n: number): NumberResult {
  return reduce(n, { keepMasters: true });
}

/**
 * The compound of a total (rules spec 3.5): totals above `max` (52) are
 * reduced by digit sum until they are `max` or less, e.g. 59 → 14.
 * Returns the compound and the steps taken from the original total.
 */
export function toCompound(total: number, max = 52): { compound: number; chain: number[] } {
  assertNonNegativeInt(total);
  const chain = [total];
  let compound = total;
  while (compound > max) {
    compound = digitSum(compound);
    chain.push(compound);
  }
  return { compound, chain };
}

/** Writes a chain the way the report shows it: "33 → 6". */
export function formatChain(chain: readonly number[]): string {
  return chain.join(" → ");
}

/** Writes a kept master the way the report shows it: "11/2"; other values as is. */
export function formatValue(result: Pick<NumberResult, "value" | "reduced">): string {
  return result.value === result.reduced
    ? String(result.value)
    : `${result.value}/${result.reduced}`;
}

function assertNonNegativeInt(n: number): void {
  if (!Number.isSafeInteger(n) || n < 0) {
    throw new EngineError("invalid_input", `Expected a non-negative whole number, got ${n}.`);
  }
}
