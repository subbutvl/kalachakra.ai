import { ruleProfiles, rulesVersions } from "@kalachakra/rules";
import { resolveRules, type ResolvedRules, type RulesCatalog } from "../src/index.js";

export const catalog: RulesCatalog = { versions: rulesVersions, profiles: ruleProfiles };

export const rules = {
  house: resolveRules(catalog, "house-default"),
  vedicpupil: resolveRules(catalog, "vedicpupil-compat"),
  practitioner: resolveRules(catalog, "sample-practitioner"),
} satisfies Record<string, ResolvedRules>;

/** A deep copy of the v1.0 rules files, for tests that break them on purpose. */
export function cloneV1(): Record<string, unknown> {
  return structuredClone(rulesVersions["v1.0"]) as unknown as Record<string, unknown>;
}
