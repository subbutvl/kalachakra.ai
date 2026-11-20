import { z } from "zod";
import { RULES_FILE_SCHEMAS, RuleProfileSchema } from "./rules.js";

/**
 * JSON Schemas for every rules file and for rule profiles, generated from the
 * Zod schemas so the two can never disagree. Written to packages/rules/schema
 * by `pnpm --filter @kalachakra/engine gen:schemas`; a test fails if the
 * committed files are stale. Cross-file checks (A to Z coverage, friendship
 * rows, D1 to D24 completeness) live in the loader, not in these schemas.
 */
export function rulesJsonSchemas(): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [name, schema] of Object.entries(RULES_FILE_SCHEMAS)) {
    out[`${name}.schema.json`] = z.toJSONSchema(schema, { target: "draft-2020-12" });
  }
  out["profile.schema.json"] = z.toJSONSchema(RuleProfileSchema, { target: "draft-2020-12" });
  return out;
}
