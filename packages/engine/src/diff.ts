/** Leaves that are working or references, not results, and are left out of a rules diff. */
const SKIP = new Set([
  "trace",
  "text_keys",
  "rule_refs",
  "meta",
  "reason",
  "components",
  "letters",
  "pairs",
]);

export interface Change {
  path: string;
  a: unknown;
  b: unknown;
}

/** Every leaf value that differs between two results, with its path (phase 1 spec 7, rules diff). */
export function diffResults(a: unknown, b: unknown, path = ""): Change[] {
  if (a === b) return [];
  const isObj = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null;
  if (
    Array.isArray(a) &&
    Array.isArray(b) &&
    a.every((x) => !isObj(x)) &&
    b.every((x) => !isObj(x))
  ) {
    return JSON.stringify(a) === JSON.stringify(b) ? [] : [{ path, a, b }];
  }
  if (isObj(a) && isObj(b)) {
    const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])];
    return keys
      .filter((k) => !SKIP.has(k))
      .flatMap((k) =>
        diffResults(a[k], b[k], Array.isArray(a) ? `${path}[${k}]` : path ? `${path}.${k}` : k),
      );
  }
  return [{ path, a, b }];
}
