// @kalachakra/engine: pure calculation. No database, no network, no UI, no
// clock. Rule data is passed in (see resolveRules), never read from disk.
// Milestone 1: foundations (rules, reduction, letters, planets). Milestone 2: computeProfile.

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

// Milestone 2: person engine
export { computeProfile } from "./profile.js";
export * from "./schemas/person.js";
export { ProfileResultSchema, ChaldeanNameSchema, type ProfileResult } from "./schemas/profile.js";
export * from "./core/dates.js";
export { sha256Hex, canonicalJson, inputHash } from "./core/hash.js";
export { sunriseUtcMinutes } from "./core/sun.js";
export { birthMoment, DEFAULT_UTC_OFFSET, type BirthMoment } from "./modules/birth.js";
export { dateNumbers, type DateNumbers } from "./modules/dateNumbers.js";
export {
  chaldeanName,
  chaldeanNumber,
  compoundInfo,
  nameFit,
  type ChaldeanName,
  type NameNumber,
  type NameFit,
  type CompoundInfo,
} from "./modules/chaldean.js";
export { pythagorean, type PythagoreanProfile } from "./modules/pythagorean.js";
export { kua, type KuaResult } from "./modules/kua.js";
export { loshu, type LoshuGrid } from "./modules/loshu.js";
export { driverConductor, type DriverConductor } from "./modules/driverConductor.js";
export { lucky, type LuckySet } from "./modules/lucky.js";
export { timing, type Timing } from "./modules/timing.js";

// Milestone 3: commercial modules
export {
  suggestNames,
  scoreSpelling,
  generateVariants,
  readable,
  type NameSuggestions,
  type ScoredName,
  type Variant,
} from "./modules/nameOptimizer.js";
export {
  computeMobile,
  readDigits,
  elementFlow,
  fitWith,
  goEasyDigits,
  nationalNumber,
  targetTotals,
  ownerOf,
  type MobileRequest,
  type MobileResult,
  type MobileReading,
  type NumberReading,
  type FlowPair,
  type Owner,
} from "./modules/mobile.js";
export { computeVehicle, type VehicleResult, type VehicleReading } from "./modules/vehicle.js";
export { computeHouse, type HouseRequest, type HouseResult } from "./modules/house.js";
export {
  computeBusiness,
  countBusinessName,
  type BusinessRequest,
  type BusinessResult,
  type BusinessName,
} from "./modules/business.js";
export {
  computeCompatibility,
  lifePathKind,
  type CompatibilityResult,
  type Relationship,
} from "./modules/compatibility.js";
export { findDates, type DateRequest, type DateResult } from "./modules/dates.js";
