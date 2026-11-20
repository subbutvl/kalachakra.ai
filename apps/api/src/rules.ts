import { ruleProfiles, rulesVersions, DEFAULT_PROFILE_ID } from "@kalachakra/rules";
import { resolveRules, type ResolvedRules, type RulesCatalog } from "@kalachakra/engine";

export const catalog: RulesCatalog = { versions: rulesVersions, profiles: ruleProfiles };

/**
 * A request's rule_profile: a profile id, or (practitioner mode) an inline
 * custom profile. Missing means the house default.
 */
export function rulesFor(profile: unknown): ResolvedRules {
  return resolveRules(catalog, profile ?? DEFAULT_PROFILE_ID);
}

/** Today's date in India, used when a request gives no as_of. The engine itself never reads the clock. */
export function todayInIndia(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  return parts; // en-CA formats as YYYY-MM-DD
}
