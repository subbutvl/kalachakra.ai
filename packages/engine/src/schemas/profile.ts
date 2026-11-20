import { z } from "zod";
import { NumberResultSchema, PlanetSchema } from "./common.js";

/**
 * The shape of computeProfile's result (phase 1 spec 4.1, 4.2, 9). Every
 * result is checked against this before it leaves the engine, and the API and
 * web app take their types from it.
 */

const Num = NumberResultSchema;
const PlanetNum = NumberResultSchema.extend({ planet: PlanetSchema });
const Keys = z.array(z.string());
const Direction = z.enum(["N", "NE", "E", "SE", "S", "SW", "W", "NW"]);

const PairScoreSchema = z.object({
  a: z.int(),
  b: z.int(),
  planetA: PlanetSchema,
  planetB: PlanetSchema,
  score: z.int().min(-2).max(2),
  label: z.enum(["friendly", "neutral", "opposed"]),
  views: z.object({ aToB: z.int(), bToA: z.int() }).optional(),
  samePlanet: z.boolean(),
  trace: z.array(z.string()),
});

const Letter = z.object({ letter: z.string().length(1), value: z.int(), vowel: z.boolean() });
const Part = z.object({ part: z.string(), letters: z.array(Letter), total: z.int() });

const CompoundSchema = z.object({
  value: z.int().min(10),
  name: z.string(),
  read_like: z.int().optional(),
  class: z.enum(["favourable", "mixed", "unfavourable"]).optional(),
  text_key: z.string(),
});

const NameNumberSchema = z.object({
  total: z.int(),
  number: PlanetNum,
  compound: CompoundSchema.optional(),
  letters: z.array(Part),
});

export const ChaldeanNameSchema = z.object({
  kind: z.enum(["daily_use", "birth_certificate"]),
  name: z.string(),
  normalised: z.string(),
  name_number: NameNumberSchema,
  parts: z.object({
    first: NameNumberSchema,
    surname: NameNumberSchema.optional(),
    initials: NameNumberSchema.extend({ form: z.string() }).optional(),
  }),
  fit: z.object({
    mulank: z.int(),
    bhagyank: z.int(),
    total: z.int().min(-4).max(4),
    label: z.enum(["supported", "mixed", "opposed"]),
    pairs: z.object({ mulank: PairScoreSchema, bhagyank: PairScoreSchema }),
  }),
});

const Span = z.object({ number: Num, from_age: z.int(), to_age: z.int().optional() });
const MaturitySchema = Num.extend({ system: z.enum(["pythagorean", "chaldean"]) });
const LetterRef = z.object({ letter: z.string(), value: z.int(), text_keys: Keys });

export const ProfileResultSchema = z.object({
  meta: z.object({
    engine: z.string(),
    rules: z.string(),
    profile: z.string(),
    as_of: z.string(),
    input_hash: z.string().regex(/^sha256:[0-9a-f]{64}$/),
  }),
  person: z.object({
    name: z.string(),
    normalised: z.string(),
    dob: z.string(),
    /** The date the numbers use (differs from dob only under the sunrise boundary). */
    working_date: z.string(),
    gender: z.enum(["male", "female", "unspecified"]),
    kua_basis: z.enum(["male", "female"]).optional(),
    notes: z.array(z.string()),
  }),
  date_numbers: z.object({
    mulank: PlanetNum,
    bhagyank: PlanetNum,
    birthday: z.object({ value: z.int().min(1).max(31), text_keys: Keys }),
    karmic_debt: z.array(z.int()),
    master_day: z.boolean(),
  }),
  chaldean: z.object({ headline: ChaldeanNameSchema, others: z.array(ChaldeanNameSchema) }),
  pythagorean: z.object({
    name: z.string(),
    life_path: Num,
    expression: Num,
    soul_urge: Num,
    personality: Num,
    maturity: MaturitySchema,
    maturity_other: MaturitySchema.optional(),
    hidden_passion: z.object({ values: z.array(z.int()), count: z.int(), text_keys: Keys }),
    karmic_lessons: z.object({ values: z.array(z.int()), text_keys: Keys }),
    subconscious_self: z.object({ value: z.int().min(0).max(9), text_keys: Keys }),
    balance: Num,
    rational_thought: Num,
    cornerstone: LetterRef,
    capstone: LetterRef,
    first_vowel: LetterRef.optional(),
    planes_of_expression: z.record(
      z.enum(["physical", "mental", "emotional", "intuitive"]),
      z.object({ count: z.int(), letters: z.array(z.string()), text_keys: Keys }),
    ),
    birth_chart: z.object({
      cells: z.record(z.string(), z.int()),
      arrows: z.array(
        z.object({
          id: z.enum(["123", "456", "789", "147", "258", "369", "159", "357"]),
          kind: z.enum(["strength", "weakness"]),
          text_key: z.string(),
        }),
      ),
    }),
  }),
  loshu: z.object({
    layout: z.array(z.array(z.int())),
    cells: z.record(
      z.string(),
      z.object({
        count: z.int(),
        band: z.enum(["missing", "single", "double", "triple", "four_plus"]),
        sources: z.array(z.enum(["dob", "mulank", "bhagyank", "kua"])),
        direction: z.string(),
        element: z.string(),
        text_keys: Keys,
      }),
    ),
    inputs: z.array(
      z.object({
        value: z.int().min(1).max(9),
        source: z.enum(["dob", "mulank", "bhagyank", "kua"]),
      }),
    ),
    missing: z.array(z.int()),
    repeated: z.array(z.int()),
    planes: z.record(
      z.string(),
      z.object({
        numbers: z.array(z.int()),
        present: z.int(),
        state: z.enum(["complete", "partial", "empty"]),
        text_key: z.string(),
      }),
    ),
    remedies: z.array(
      z.object({
        number: z.int(),
        direction: z.string(),
        element: z.string(),
        colours: z.array(z.string()),
        tags: z.array(z.object({ tag: z.string(), text_key: z.string() })),
      }),
    ),
    elements: z.record(z.string(), z.int()),
    trace: z.array(z.string()),
    rule_refs: z.array(z.string()),
  }),
  kua: z
    .object({
      value: z.int().min(1).max(9),
      group: z.enum(["east", "west"]),
      basis: z.enum(["male", "female"]),
      solar_year: z.int(),
      directions: z.record(z.string(), Direction),
      good: z.array(z.string()),
      avoid: z.array(z.string()),
      trace: z.array(z.string()),
      rule_refs: z.array(z.string()),
      text_keys: Keys,
      uncertain: z.string().optional(),
    })
    .refine((k) => k.value !== 5, "Kua is never 5")
    .nullable(),
  driver_conductor: z.object({
    driver: z.int(),
    conductor: z.int(),
    pair: PairScoreSchema,
    special: z.string().optional(),
    text_keys: Keys,
    rule_refs: z.array(z.string()),
  }),
  lucky: z.object({
    numbers: z.array(z.int()),
    ranked: z.array(z.object({ number: z.int(), planet: PlanetSchema, bhagyank_score: z.int() })),
    days: z.array(z.string()),
    colours: z.array(z.string()),
    trace: z.array(z.string()),
    text_keys: Keys,
  }),
  timing: z.object({
    as_of: z.string(),
    age: z.int(),
    universal: z.object({ year: Num, month: Num, day: Num }),
    personal_year: Num.extend({ year: z.int() }),
    birthday_year: z.object({ from_year: z.int(), value: z.int(), reduced: z.int() }).optional(),
    personal_month: Num.extend({ year: z.int(), month: z.int() }),
    personal_day: Num,
    months_ahead: z
      .array(z.object({ year: z.int(), month: z.int(), personal_month: Num }))
      .length(12),
    pinnacles: z.array(Span).length(4),
    challenges: z.array(Span).length(4),
    current_pinnacle: z.int(),
    periods: z.array(Span).length(3),
    transits: z.array(z.object({ part: z.string(), letter: z.string(), value: z.int() })),
    essence: Num,
    dasha: z.object({
      method: z.enum(["mulank_led", "none"]),
      periods: z.array(z.object({ number: z.int(), from_age: z.int(), to_age: z.int() })),
      current: z.object({ number: z.int(), from_age: z.int(), to_age: z.int() }).optional(),
      sub_period: z.int().optional(),
    }),
    next_10_years: z
      .array(
        z.object({
          year: z.int(),
          age: z.int(),
          personal_year: Num,
          universal_year: z.int(),
          pinnacle: z.int(),
          dasha: z.int(),
          essence: z.int(),
        }),
      )
      .length(10),
    rule_refs: z.array(z.string()),
  }),
  /** Every flag raised anywhere in the profile, for quick display. */
  flags: z.array(z.object({ flag: z.string(), where: z.string(), value: z.int().optional() })),
});
export type ProfileResult = z.infer<typeof ProfileResultSchema>;
