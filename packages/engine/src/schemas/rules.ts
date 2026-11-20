import { z } from "zod";
import { CLASSICAL_PLANETS, ClassicalPlanetSchema, DigitSchema, PlanetSchema } from "./common.js";
import { RemedyTagSchema, SettingOverridesSchema, settingShapes } from "./settings.js";

/**
 * Zod schemas for every rules data file in packages/rules (rules spec v1.0).
 * These are the single source of truth: the JSON Schemas in
 * packages/rules/schema are generated from them (pnpm gen:schemas), and the
 * loader runs them, plus the cross-checks in rules/validate.ts, on every load.
 */

const Comment = z.string().optional();
const Status = z.enum(["draft", "reviewed"]);
const Letter = z.string().regex(/^[A-Z]$/);
const DigitKey = z.string().regex(/^[1-9]$/);
const Direction = z.enum(["N", "NE", "E", "SE", "S", "SW", "W", "NW"]);

export const ManifestSchema = z.strictObject({
  version: z.string().regex(/^v\d+\.\d+$/),
  date: z.iso.date(),
  approved_by: z.string().min(1),
  source: z.url(),
  files: z.array(z.string()),
  changelog: z
    .array(z.strictObject({ version: z.string(), date: z.iso.date(), summary: z.string() }))
    .min(1),
});

export const LettersSchema = z.strictObject({
  $comment: Comment,
  chaldean: z.record(Letter, z.int().min(1).max(8)),
  pythagorean: z.record(Letter, DigitSchema),
  vowels: z.array(Letter).min(1),
  planes_of_expression: z.strictObject({
    $comment: Comment,
    physical: z.array(Letter),
    mental: z.array(Letter),
    emotional: z.array(Letter),
    intuitive: z.array(Letter),
  }),
});

const FriendshipRow = z.strictObject({
  friends: z.array(ClassicalPlanetSchema),
  neutral: z.array(ClassicalPlanetSchema),
  enemies: z.array(ClassicalPlanetSchema),
});

export const PlanetsSchema = z.strictObject({
  $comment: Comment,
  numbers: z.record(DigitKey, PlanetSchema),
  friendship: z.record(ClassicalPlanetSchema, FriendshipRow),
  pair_score: z.strictObject({
    $comment: Comment,
    friend: z.literal(1),
    neutral: z.literal(0),
    enemy: z.literal(-1),
    same_planet: z.literal(2),
  }),
  days: z
    .strictObject({ $comment: Comment })
    .catchall(
      z.enum(["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]),
    ),
  colours: z
    .strictObject({ $comment: Comment, status: Status })
    .catchall(z.array(z.string()).min(1)),
  elements: z
    .strictObject({ $comment: Comment })
    .catchall(z.enum(["fire", "water", "space", "air", "earth"])),
});

const CompoundClass = z.enum(["favourable", "mixed", "unfavourable"]);
export const CompoundsSchema = z.strictObject({
  $comment: Comment,
  status: Status,
  max_compound: z.int().min(10),
  compounds: z.record(
    z.string().regex(/^[1-9][0-9]$/),
    z.union([
      z.strictObject({ name: z.string().min(1), class: CompoundClass }),
      z.strictObject({ read_like: z.int().min(10) }),
    ]),
  ),
});

export const LoshuSchema = z.strictObject({
  $comment: Comment,
  layout: z.array(z.array(DigitSchema).length(3)).length(3),
  south_at_top: z.boolean(),
  count_bands: z.strictObject({
    $comment: Comment,
    "0": z.literal("missing"),
    "1": z.literal("single"),
    "2": z.literal("double"),
    "3": z.literal("triple"),
    "4+": z.literal("four_plus"),
  }),
  planes: z.record(z.string(), z.array(DigitSchema).length(3)),
  plane_states: z.tuple([z.literal("complete"), z.literal("partial"), z.literal("empty")]),
  directions: z.record(DigitKey, z.union([Direction, z.literal("centre")])),
  elements: z.record(DigitKey, z.enum(["water", "earth", "wood", "metal", "fire"])),
  element_colours: z.strictObject({
    $comment: Comment,
    status: Status,
    water: z.array(z.string()).min(1),
    wood: z.array(z.string()).min(1),
    fire: z.array(z.string()).min(1),
    earth: z.array(z.string()).min(1),
    metal: z.array(z.string()).min(1),
  }),
  remedy_tags: z.array(RemedyTagSchema),
});

const KuaDirections = z.strictObject({
  success: Direction,
  health: Direction,
  relationships: Direction,
  growth: Direction,
  mishaps: Direction,
  five_ghosts: Direction,
  six_killings: Direction,
  total_loss: Direction,
});

export const KuaSchema = z.strictObject({
  $comment: Comment,
  formula: z.strictObject({
    male: z.strictObject({ base: z.literal(11), op: z.literal("minus_s") }),
    female: z.strictObject({ base: z.literal(4), op: z.literal("plus_s") }),
    kua5: z.strictObject({ male: DigitSchema, female: DigitSchema }),
  }),
  groups: z.strictObject({ east: z.array(DigitSchema), west: z.array(DigitSchema) }),
  direction_kinds: z.strictObject({
    good: z.array(KuaDirections.keyof()).length(4),
    avoid: z.array(KuaDirections.keyof()).length(4),
  }),
  directions: z.record(DigitKey, KuaDirections),
  fixed_cutoff: z.strictObject({ month: z.int().min(1).max(12), day: z.int().min(1).max(31) }),
  lichun: z.strictObject({
    $comment: Comment,
    first_year: z.int(),
    last_year: z.int(),
    precision_minutes: z.int().min(0),
    utc: z.record(z.string().regex(/^\d{4}$/), z.string().regex(/^\d{4}-02-0[2-6]T\d{2}:\d{2}Z$/)),
  }),
});

const Element = z.enum(["fire", "water", "space", "air", "earth"]);
export const MobileSchema = z.strictObject({
  $comment: Comment,
  national_number: z.strictObject({
    length: z.literal(10),
    strip_prefixes: z.array(z.string().min(1)),
  }),
  element_matrix: z.strictObject({
    smooth: z.array(z.tuple([Element, Element])),
    clash: z.array(z.tuple([Element, Element])),
  }),
  goals: z.strictObject({ $comment: Comment }).catchall(z.array(DigitSchema).min(1)),
  score: z.strictObject({
    weights: z.strictObject({
      fit: z.number(),
      flow: z.number(),
      go_easy_digits: z.number(),
      loshu_gaps_filled: z.number(),
    }),
    bands: z.array(
      z.strictObject({
        min: z.number(),
        verdict: z.enum(["keep", "keep_with_notes", "consider_second_number"]),
      }),
    ),
  }),
  finder: z.strictObject({
    target_totals: z.int().min(1),
    keep_prefix_digits: z.int().min(0).max(10),
    max_ranked_numbers: z.int().min(1),
  }),
  vehicle: z.strictObject({ $comment: Comment, letter_system: z.literal("chaldean") }),
  house: z.strictObject({
    $comment: Comment,
    letter_system: z.literal("chaldean"),
    order: z.tuple([z.literal("flat"), z.literal("building")]),
  }),
});

export const BusinessSchema = z.strictObject({
  $comment: Comment,
  limits: z.strictObject({ names: z.int().min(1), partners: z.int().min(0) }),
  legal_suffixes: z.array(z.string().min(1)),
  popular_numbers: z.array(DigitSchema),
  popular_bonus: z.number(),
  trade_map: z.strictObject({ $comment: Comment }).catchall(z.array(DigitSchema).min(1)),
  trade_bonus: z.number(),
  domain_extensions: z.array(z.string().regex(/^(\.[a-z]+)+$/)),
  ranking: z.array(z.enum(["total_score", "fewer_opposed_pairs", "input_order"])),
});

export const CompatibilitySchema = z.strictObject({
  $comment: Comment,
  relationship_types: z.array(z.enum(["couple", "business_partners", "parent_child"])),
  weights: settingShapes["compatibility.weights"].options[1],
  bands: z.array(
    z.strictObject({
      min: z.number(),
      label: z.enum(["excellent", "good", "workable", "needs_effort"]),
    }),
  ),
  life_path_pairs: z.strictObject({
    $comment: Comment,
    status: Status,
    credit: z.strictObject({
      natural: z.number().min(0).max(1),
      compatible: z.number().min(0).max(1),
      challenging: z.number().min(0).max(1),
    }),
    natural_groups: z.array(z.array(DigitSchema)),
    compatible: z.array(z.tuple([DigitSchema, DigitSchema])),
  }),
});

export const OptimizerSchema = z.strictObject({
  $comment: Comment,
  edit_rules: z.array(z.strictObject({ id: z.string(), example: z.string() })),
  top_n: z.int().min(1),
  max_candidates: z.int().min(1),
  weights: z.strictObject({
    name_pair_score: z.number(),
    compound_class: z.number(),
    first_name_fit: z.number(),
    pythagorean_not_opposed: z.number(),
    no_karmic_debt_compound: z.number(),
    readability_closeness: z.number(),
  }),
  compound_class_credit: z.strictObject({
    favourable: z.number(),
    mixed: z.number(),
    unfavourable: z.number(),
  }),
  karmic_debt_numbers: z.array(z.int()),
});

export const SwitchesSchema = z.strictObject({
  $comment: Comment,
  decisions: z.record(
    z.string().regex(/^D([1-9]|1[0-9]|2[0-4])$/),
    z.strictObject({ title: z.string().min(1), settings: SettingOverridesSchema }),
  ),
});

/** One complete rules version, as shipped in packages/rules/vX.Y. */
export const RulesVersionSchema = z.strictObject({
  manifest: ManifestSchema,
  letters: LettersSchema,
  planets: PlanetsSchema,
  compounds: CompoundsSchema,
  loshu: LoshuSchema,
  kua: KuaSchema,
  mobile: MobileSchema,
  business: BusinessSchema,
  compatibility: CompatibilitySchema,
  optimizer: OptimizerSchema,
  switches: SwitchesSchema,
});
export type RulesVersion = z.infer<typeof RulesVersionSchema>;

/** A rule profile file (packages/rules/profiles/*.json), or an inline custom profile. */
export const RuleProfileSchema = z.strictObject({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
  name: z.string().min(1),
  description: z.string().optional(),
  base: z.string().regex(/^v\d+\.\d+$/),
  overrides: SettingOverridesSchema,
});
export type RuleProfile = z.infer<typeof RuleProfileSchema>;

/** Rules data files and their schemas, for JSON Schema generation and validation messages. */
export const RULES_FILE_SCHEMAS = {
  manifest: ManifestSchema,
  letters: LettersSchema,
  planets: PlanetsSchema,
  compounds: CompoundsSchema,
  loshu: LoshuSchema,
  kua: KuaSchema,
  mobile: MobileSchema,
  business: BusinessSchema,
  compatibility: CompatibilitySchema,
  optimizer: OptimizerSchema,
  switches: SwitchesSchema,
} as const;

export { CLASSICAL_PLANETS };
