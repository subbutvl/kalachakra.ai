import { z } from "zod";
import { ClassicalPlanetSchema, PlanetSchema } from "./common.js";

/**
 * The named settings behind decisions D1 to D24 (rules spec v1.0, section 5).
 * Keys are dotted names used by rule profiles, e.g. "loshu.include_mulank".
 * The default values live in packages/rules/v1.0/switches.json; this schema
 * says which values are allowed.
 */
export const REMEDY_TAGS = [
  "colour",
  "direction",
  "habit",
  "mantra",
  "fasting",
  "gemstone",
  "donation",
] as const;
export const RemedyTagSchema = z.enum(REMEDY_TAGS);

const View = z.union([z.literal(-1), z.literal(0), z.literal(1)]);

export const CompatibilityWeightsSchema = z.strictObject({
  driver_harmony: z.number().min(0),
  conductor_harmony: z.number().min(0),
  cross_harmony: z.number().min(0),
  loshu_gap_filling: z.number().min(0),
  life_path_synergy: z.number().min(0),
  name_harmony: z.number().min(0),
  kua_group: z.number().min(0),
});

export const settingShapes = {
  // D1
  "names.analysed": z.enum(["both", "birth_certificate", "daily_use"]),
  // D2
  "date.day_boundary": z.enum(["civil_midnight", "sunrise"]),
  // D3
  "masters.mode": z.enum(["always_reduce", "pythagorean_and_personal_years", "everywhere"]),
  // D4
  "letters.y_vowel": z.enum(["never", "always", "by_sound"]),
  // D5
  "bhagyank.sum_method": z.enum(["all_digits", "components_first"]),
  // D6
  "planets.rahu_proxy": ClassicalPlanetSchema,
  "planets.ketu_proxy": ClassicalPlanetSchema,
  "planets.view_overrides": z.partialRecord(PlanetSchema, z.partialRecord(PlanetSchema, View)),
  // D7
  "driver_conductor.special_pairs": z.array(z.string().regex(/^[1-9]-[1-9]$/)),
  // D8
  "compounds.classification": z.enum(["classical_draft", "none"]),
  // D9
  "maturity.headline": z.enum(["pythagorean", "chaldean"]),
  "maturity.show_other": z.boolean(),
  // D10
  "loshu.include_mulank": z.enum(["always", "two_digit_days_only", "never"]),
  // D11
  "loshu.include_kua": z.boolean(),
  // D12
  "kua.year_cutoff": z.enum(["jan_1", "fixed_feb_4", "lichun"]),
  // D13
  "personal_year.start": z.enum(["jan_1", "birthday"]),
  "personal_year.show_birthday_year": z.boolean(),
  // D14
  "dasha.method": z.enum(["none", "mulank_led"]),
  // D15
  "optimizer.max_edits": z.int().min(1).max(3),
  "optimizer.lock_first_letter": z.boolean(),
  // D16
  "mobile.zero_mode": z.enum(["ignore", "pause", "amplifier"]),
  // D17
  "vehicle.letters": z.enum(["digits_only", "chaldean", "both"]),
  // D18
  "compatibility.weights": z.union([z.literal("default"), CompatibilityWeightsSchema]),
  // D19
  "remedies.enabled_tags": z.array(RemedyTagSchema),
  // D20
  "mobile.reading_model": z.enum(["classic", "element_flow", "both"]),
  // D21
  "mobile.avoid_pairs": z.array(z.string().regex(/^[0-9]{2}$/)),
  // D22
  "business.legal_suffix": z.enum(["exclude", "include"]),
  "business.ampersand": z.enum(["ignore", "as_and"]),
  "business.digits": z.enum(["face_value"]),
  // D23
  "business.bonus": z.enum(["none", "popular", "by_trade"]),
  // D24
  "business.domain_count": z.enum(["with_extension", "name_only"]),
} as const;

export type SettingKey = keyof typeof settingShapes;
export const SETTING_KEYS = Object.keys(settingShapes) as SettingKey[];

/** A complete set of settings: every key present. */
export const SettingsSchema = z.strictObject(settingShapes);
export type Settings = z.infer<typeof SettingsSchema>;

/** A partial set, as written in a rule profile's "overrides". Unknown keys are rejected. */
export const SettingOverridesSchema = SettingsSchema.partial();
export type SettingOverrides = z.infer<typeof SettingOverridesSchema>;
