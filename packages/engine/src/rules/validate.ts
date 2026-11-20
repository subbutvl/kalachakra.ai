import type { z } from "zod";
import { CLASSICAL_PLANETS } from "../schemas/common.js";
import { RULES_FILE_SCHEMAS, type RulesVersion } from "../schemas/rules.js";
import { SETTING_KEYS, SettingsSchema, type Settings } from "../schemas/settings.js";
import { EngineError } from "../errors.js";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

/** Formats Zod issues as one readable line per problem, with the JSON path. */
export function formatIssues(prefix: string, issues: readonly z.core.$ZodIssue[]): string {
  return issues
    .map((i) => `${prefix}${i.path.length ? "." + i.path.join(".") : ""}: ${i.message}`)
    .join("; ");
}

/**
 * Validates one raw rules version (the JSON files of packages/rules/vX.Y)
 * against the schemas, then runs the cross-file checks a schema cannot
 * express. Throws EngineError("invalid_rules") listing every problem found.
 */
export function validateRulesVersion(raw: unknown): RulesVersion {
  const problems: string[] = [];
  if (typeof raw !== "object" || raw === null) {
    throw new EngineError("invalid_rules", "Rules version must be an object of rules files.");
  }
  const files = raw as Record<string, unknown>;
  for (const [name, schema] of Object.entries(RULES_FILE_SCHEMAS)) {
    if (!(name in files)) {
      problems.push(`${name}.json is missing`);
      continue;
    }
    const result = schema.safeParse(files[name]);
    if (!result.success) problems.push(formatIssues(name, result.error.issues));
  }
  for (const name of Object.keys(files)) {
    if (!(name in RULES_FILE_SCHEMAS)) problems.push(`${name}.json is not a known rules file`);
  }
  if (problems.length) throw new EngineError("invalid_rules", problems.join("; "));

  const rules = raw as RulesVersion;
  problems.push(...crossCheck(rules));
  if (problems.length) throw new EngineError("invalid_rules", problems.join("; "));
  return rules;
}

function crossCheck(r: RulesVersion): string[] {
  const p: string[] = [];

  // Letter tables cover A to Z exactly once each.
  for (const system of ["chaldean", "pythagorean"] as const) {
    const keys = Object.keys(r.letters[system]).sort();
    if (keys.join("") !== ALPHABET.join("")) {
      const missing = ALPHABET.filter((l) => !keys.includes(l));
      p.push(
        `letters.${system} must cover A to Z exactly (missing: ${missing.join(" ") || "none"})`,
      );
    }
  }
  const planeLetters = Object.entries(r.letters.planes_of_expression)
    .filter(([k]) => k !== "$comment")
    .flatMap(([, v]) => v as string[]);
  if ([...planeLetters].sort().join("") !== ALPHABET.join("")) {
    p.push("letters.planes_of_expression must place every letter A to Z in exactly one plane");
  }

  // Numbers 1 to 9 map to the nine distinct planets.
  const nums = r.planets.numbers;
  const planets = Object.values(nums);
  if (Object.keys(nums).length !== 9 || new Set(planets).size !== 9) {
    p.push("planets.numbers must map 1 to 9 to nine distinct planets");
  }

  // Every classical planet has a row, and each row names the other six exactly once.
  for (const planet of CLASSICAL_PLANETS) {
    const row = r.planets.friendship[planet];
    if (!row) {
      p.push(`planets.friendship.${planet} is missing`);
      continue;
    }
    const seen = [...row.friends, ...row.neutral, ...row.enemies];
    const others = CLASSICAL_PLANETS.filter((x) => x !== planet);
    if (seen.length !== 6 || others.some((o) => !seen.includes(o))) {
      p.push(`planets.friendship.${planet} must list each of the other six planets exactly once`);
    }
  }
  for (const key of ["days", "colours", "elements"] as const) {
    for (const planet of planets) {
      if (!(planet in r.planets[key])) p.push(`planets.${key}.${planet} is missing`);
    }
  }

  // Compounds 10 to max are all present; read_like points at a compound with its own reading.
  for (let n = 10; n <= r.compounds.max_compound; n++) {
    const c = r.compounds.compounds[String(n)];
    if (!c) {
      p.push(`compounds.${n} is missing`);
      continue;
    }
    if ("read_like" in c) {
      const target = r.compounds.compounds[String(c.read_like)];
      if (!target || !("name" in target) || c.read_like >= n) {
        p.push(`compounds.${n}.read_like must point to an earlier compound with its own reading`);
      }
    }
  }

  // Lo Shu layout uses 1 to 9 once; planes use real digits; directions and elements cover 1 to 9.
  const flat = r.loshu.layout.flat();
  if ([...flat].sort().join("") !== "123456789")
    p.push("loshu.layout must use 1 to 9 exactly once");
  for (const key of ["directions", "elements"] as const) {
    if (Object.keys(r.loshu[key]).length !== 9) p.push(`loshu.${key} must cover 1 to 9`);
  }

  // Kua: groups split 1-9 minus 5; each direction row uses all eight directions once.
  const groups = [...r.kua.groups.east, ...r.kua.groups.west].sort().join("");
  if (groups !== "12346789") p.push("kua.groups must split 1-4 and 6-9 into east and west");
  for (const k of ["1", "2", "3", "4", "6", "7", "8", "9"]) {
    const row = r.kua.directions[k];
    if (!row) p.push(`kua.directions.${k} is missing`);
    else if (new Set(Object.values(row)).size !== 8) {
      p.push(`kua.directions.${k} must use each of the eight directions once`);
    }
  }
  const { first_year, last_year, utc } = r.kua.lichun;
  for (let y = first_year; y <= last_year; y++) {
    const at = utc[String(y)];
    if (!at || !at.startsWith(`${y}-`))
      p.push(`kua.lichun.utc.${y} is missing or in the wrong year`);
  }

  // Switches: every setting key is defined exactly once across D1 to D24, with a valid value.
  const decisions = Object.keys(r.switches.decisions);
  if (decisions.length !== 24)
    p.push(`switches.decisions must hold D1 to D24 (found ${decisions.length})`);
  const counts = new Map<string, number>();
  for (const d of Object.values(r.switches.decisions)) {
    for (const k of Object.keys(d.settings)) counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  for (const key of SETTING_KEYS) {
    const n = counts.get(key) ?? 0;
    if (n !== 1)
      p.push(`switches: setting "${key}" must be defined by exactly one decision (found ${n})`);
  }

  // Avoid pairs and special pairs are well formed (regex in schema); goals use digits.
  return p;
}

/** Flattens switches.json into the complete default settings and a key → decision map. */
export function defaultSettings(r: RulesVersion): {
  settings: Settings;
  decisionOf: Record<string, string>;
} {
  const merged: Record<string, unknown> = {};
  const decisionOf: Record<string, string> = {};
  for (const [id, d] of Object.entries(r.switches.decisions)) {
    for (const [k, v] of Object.entries(d.settings)) {
      merged[k] = v;
      decisionOf[k] = id;
    }
  }
  const parsed = SettingsSchema.safeParse(merged);
  if (!parsed.success) {
    throw new EngineError("invalid_rules", formatIssues("switches", parsed.error.issues));
  }
  return { settings: parsed.data, decisionOf };
}
