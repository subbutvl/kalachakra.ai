import { RuleProfileSchema, type RuleProfile, type RulesVersion } from "../schemas/rules.js";
import {
  SETTING_KEYS,
  settingShapes,
  type SettingKey,
  type Settings,
} from "../schemas/settings.js";
import { EngineError } from "../errors.js";
import { defaultSettings, formatIssues, validateRulesVersion } from "./validate.js";

/**
 * Everything the engine needs to calculate: one validated rules version,
 * merged with one rule profile. Modules take this as an argument and never
 * read files themselves (phase 1 spec 4.3, 4.4).
 */
export interface ResolvedRules {
  rulesVersion: string;
  profile: { id: string; name: string; description?: string; base: string };
  settings: Settings;
  /** For every setting: which decision it belongs to, its default, and where its value came from. */
  sources: Record<SettingKey, SettingSource>;
  data: RulesVersion;
}

export interface SettingSource {
  decision: string;
  source: "default" | "profile";
  default: unknown;
}

/** Raw inputs to the loader: rules versions and profiles exactly as read from packages/rules. */
export interface RulesCatalog {
  versions: Record<string, unknown>;
  profiles: Record<string, unknown>;
}

const validatedVersions = new WeakMap<object, RulesVersion>();

function getVersion(catalog: RulesCatalog, version: string): RulesVersion {
  const raw = catalog.versions[version];
  if (raw === undefined) {
    throw new EngineError(
      "unknown_rules_version",
      `Rules version "${version}" is not available (have: ${Object.keys(catalog.versions).join(", ")}).`,
      "rule_profile.base",
    );
  }
  if (typeof raw === "object" && raw !== null) {
    const cached = validatedVersions.get(raw);
    if (cached) return cached;
  }
  const rules = validateRulesVersion(raw);
  validatedVersions.set(raw as object, rules);
  return rules;
}

/** Validates a rule profile (file or inline custom). Unknown setting names are rejected. */
export function parseRuleProfile(raw: unknown): RuleProfile {
  const result = RuleProfileSchema.safeParse(raw);
  if (result.success) return result.data;
  const unknownKey = result.error.issues.find(
    (i) => i.code === "unrecognized_keys" && i.path.join(".") === "overrides",
  );
  if (unknownKey && unknownKey.code === "unrecognized_keys") {
    throw new EngineError(
      "unknown_setting",
      `Unknown setting(s) in profile overrides: ${unknownKey.keys.join(", ")}.`,
      `rule_profile.overrides.${unknownKey.keys[0]}`,
    );
  }
  const first = result.error.issues[0];
  const inOverrides = first?.path[0] === "overrides";
  throw new EngineError(
    inOverrides ? "invalid_setting" : "invalid_profile",
    formatIssues("rule_profile", result.error.issues),
    first ? ["rule_profile", ...first.path].join(".") : "rule_profile",
  );
}

/**
 * Resolves a profile (by id from the catalog, or an inline custom profile)
 * against its base rules version. The result records every setting's source.
 */
export function resolveRules(catalog: RulesCatalog, profile: string | unknown): ResolvedRules {
  let raw: unknown = profile;
  if (typeof profile === "string") {
    raw = catalog.profiles[profile];
    if (raw === undefined) {
      throw new EngineError(
        "unknown_profile",
        `Rule profile "${profile}" does not exist (have: ${Object.keys(catalog.profiles).join(", ")}).`,
        "rule_profile",
      );
    }
  }
  const parsed = parseRuleProfile(raw);
  const data = getVersion(catalog, parsed.base);
  const { settings: defaults, decisionOf } = defaultSettings(data);

  const settings = { ...defaults } as Record<SettingKey, unknown>;
  const sources = {} as Record<SettingKey, SettingSource>;
  for (const key of SETTING_KEYS) {
    const overridden = key in parsed.overrides;
    if (overridden) {
      // Re-validate the single value so a bad override names its own key.
      const check = settingShapes[key].safeParse(parsed.overrides[key]);
      if (!check.success) {
        throw new EngineError(
          "invalid_setting",
          formatIssues(`rule_profile.overrides.${key}`, check.error.issues),
          `rule_profile.overrides.${key}`,
        );
      }
      settings[key] = check.data;
    }
    sources[key] = {
      decision: decisionOf[key] ?? "?",
      source: overridden ? "profile" : "default",
      default: defaults[key],
    };
  }

  return {
    rulesVersion: data.manifest.version,
    profile: {
      id: parsed.id,
      name: parsed.name,
      ...(parsed.description === undefined ? {} : { description: parsed.description }),
      base: parsed.base,
    },
    settings: settings as Settings,
    sources,
    data,
  };
}

export interface ProfileSummary {
  id: string;
  name: string;
  description?: string;
  base: string;
  overrides: number;
}

/** Lists the profiles in a catalog (phase 1 spec 4.1, listRuleProfiles). Each is validated. */
export function listRuleProfiles(catalog: RulesCatalog): ProfileSummary[] {
  return Object.values(catalog.profiles).map((raw) => {
    const p = parseRuleProfile(raw);
    return {
      id: p.id,
      name: p.name,
      ...(p.description === undefined ? {} : { description: p.description }),
      base: p.base,
      overrides: Object.keys(p.overrides).length,
    };
  });
}

export interface SettingDescription {
  key: SettingKey;
  decision: string;
  title: string;
  value: unknown;
  default: unknown;
  source: "default" | "profile";
}

/** Every setting with its value and source (phase 1 spec 4.1, describeRules), in D1 to D24 order. */
export function describeRules(rules: ResolvedRules): SettingDescription[] {
  const order = (d: string) => Number(d.slice(1));
  return SETTING_KEYS.map((key) => {
    const s = rules.sources[key];
    return {
      key,
      decision: s.decision,
      title: rules.data.switches.decisions[s.decision]?.title ?? "",
      value: rules.settings[key],
      default: s.default,
      source: s.source,
    };
  }).sort((a, b) => order(a.decision) - order(b.decision));
}
