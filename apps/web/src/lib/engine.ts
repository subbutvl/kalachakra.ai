import { ruleProfiles, rulesVersions } from "@kalachakra/rules";
import {
  computeProfile,
  describeRules,
  diffResults,
  resolveRules,
  type PersonInput,
  type ProfileResult,
  type ResolvedRules,
  type RulesCatalog,
} from "@kalachakra/engine";

/**
 * The engine runs in the page in practitioner mode, so every number updates as
 * the practitioner types (phase 1 spec 4.1). The same rules data and engine
 * run behind the API.
 */
export const catalog: RulesCatalog = { versions: rulesVersions, profiles: ruleProfiles };

export type ProfileChoice = { kind: "id"; id: string } | { kind: "custom"; overrides: Record<string, unknown> };

export const PROFILE_OPTIONS = [
  { id: "house-default", label: "House default (rules v1.0)" },
  { id: "sample-practitioner", label: "Sample practitioner" },
  { id: "kalachakra-classic", label: "KalaChakra Classic" },
];

/** The rule profile to send to the API, or resolve here. */
export function profileRef(choice: ProfileChoice): string | { id: string; name: string; base: string; overrides: Record<string, unknown> } {
  return choice.kind === "id" ? choice.id : { id: "custom", name: "Custom", base: "v1.0", overrides: choice.overrides };
}

export function rulesFor(choice: ProfileChoice): ResolvedRules {
  return resolveRules(catalog, profileRef(choice));
}

export function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function profileFor(person: PersonInput, rules: ResolvedRules, suggestions = 5): ProfileResult {
  return computeProfile({ person, as_of: todayIso(), options: { name_suggestions: suggestions } }, rules);
}

export { describeRules, diffResults };
