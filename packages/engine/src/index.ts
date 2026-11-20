// @kalachakra/engine: pure calculation. No database, no network, no UI, no
// clock. Rule data is passed in (see resolveRules), never read from disk.
// Milestone 1 exposes the foundations: rules loading, reduction, letter
// tables, planets and pair score. The compute* functions arrive in M2 and M3.

export { ENGINE_VERSION } from "./version.js";
export { EngineError, type EngineErrorCode } from "./errors.js";

// Schemas and types
export * from "./schemas/common.js";
export * from "./schemas/settings.js";
export * from "./schemas/rules.js";
export { rulesJsonSchemas } from "./schemas/jsonSchema.js";

// Rules
export {
  resolveRules,
  parseRuleProfile,
  listRuleProfiles,
  describeRules,
  type ResolvedRules,
  type RulesCatalog,
  type SettingSource,
  type ProfileSummary,
  type SettingDescription,
} from "./rules/loader.js";
export { validateRulesVersion, defaultSettings } from "./rules/validate.js";

// Core
export {
  digitSum,
  isMaster,
  reduce,
  reduceKeepMaster,
  toCompound,
  formatChain,
  formatValue,
  type ReduceOptions,
} from "./core/reduce.js";
export { keepMasters, type MasterContext } from "./core/masters.js";
export {
  normaliseName,
  letterValue,
  isVowelAt,
  scoreName,
  sumByVowel,
  type NormalisedName,
  type LetterScore,
  type PartScore,
  type NameScore,
  type LetterTables,
  type YVowelMode,
} from "./core/letters.js";
export {
  planetOf,
  planetName,
  effectivePlanet,
  viewOf,
  pairScore,
  labelOf,
  type View,
  type ViewResult,
  type PairScore,
  type PairLabel,
} from "./core/planets.js";
