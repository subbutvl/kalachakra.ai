import {
  PersonSchema,
  ProfileOptionsSchema,
  RuleProfileSchema,
  IsoDateSchema,
} from "@kalachakra/engine";
import { z } from "zod";

/**
 * Request bodies. Every request may carry rule_profile (an id, or an inline
 * custom profile in practitioner mode), as_of, audience and language
 * (phase 1 spec, section 7). Audience and language are used by the report
 * builder from milestone 5.
 */
export const Person = PersonSchema.meta({
  id: "Person",
  example: { name: "Aarav Mehra", other_names: [], dob: "1991-08-14", gender: "male" },
});

export const RuleProfileRef = z
  .union([z.string().meta({ example: "house-default" }), RuleProfileSchema])
  .optional()
  .meta({
    description:
      "A profile id (house-default, vedicpupil-compat, sample-practitioner) or an inline custom profile.",
  });

export const Common = {
  rule_profile: RuleProfileRef,
  as_of: IsoDateSchema.optional().meta({
    description: "Defaults to today in India.",
    example: "2026-11-20",
  }),
  audience: z.enum(["adult", "child"]).optional(),
  language: z.enum(["en", "ta"]).optional(),
};

export const ProfileBody = z
  .object({ person: Person, options: ProfileOptionsSchema.optional(), ...Common })
  .meta({ id: "ProfileRequest" });

export const NameSuggestBody = z
  .object({
    person: Person,
    name: z
      .string()
      .min(1)
      .optional()
      .meta({ description: "The name to optimise; defaults to person.name." }),
    limits: z.object({ top_n: z.int().min(1).max(20).optional() }).optional(),
    ...Common,
  })
  .meta({ id: "NameSuggestRequest" });

export const NameScoreBody = z
  .object({ person: Person, name: z.string().min(1).meta({ example: "Aarave Mehra" }), ...Common })
  .meta({ id: "NameScoreRequest" });

export const MobileBody = z
  .object({
    person: Person,
    numbers: z
      .array(z.string())
      .min(1)
      .max(20)
      .meta({ example: ["+91 98765 24310"] }),
    goals: z
      .array(z.enum(["finance", "business_growth", "career", "peace_of_mind", "relationships"]))
      .optional(),
    find_for: z
      .string()
      .optional()
      .meta({ description: "A number (or 6-digit prefix) to find new endings for." }),
    max_candidates: z.int().min(1).max(50).optional(),
    ...Common,
  })
  .meta({ id: "MobileRequest" });

export const VehicleBody = z
  .object({
    person: Person,
    registrations: z
      .array(z.string())
      .min(1)
      .max(20)
      .meta({ example: ["KA 05 MN 1234"] }),
    ...Common,
  })
  .meta({ id: "VehicleRequest" });

const Direction = z.enum(["N", "NE", "E", "SE", "S", "SW", "W", "NW"]);
export const HouseBody = z
  .object({
    residents: z.array(Person).min(1).max(10),
    flat: z.string().optional().meta({ example: "12B" }),
    building: z.string().optional(),
    door: Direction.optional(),
    ...Common,
  })
  .meta({ id: "HouseRequest" });

export const BusinessBody = z
  .object({
    owner: Person,
    partners: z.array(Person).max(3).optional(),
    names: z
      .array(z.string().min(1))
      .min(1)
      .max(5)
      .meta({ example: ["Loomcraft Works", "Mehra Textiles Pvt Ltd"] }),
    trade: z.string().optional(),
    incorporation_date: IsoDateSchema.optional(),
    spelling_ideas: z.int().min(0).max(5).optional(),
    ...Common,
  })
  .meta({ id: "BusinessRequest" });

export const CompatibilityBody = z
  .object({
    a: Person,
    b: Person,
    relationship: z.enum(["couple", "business_partners", "parent_child"]),
    ...Common,
  })
  .meta({ id: "CompatibilityRequest" });

export const DatesBody = z
  .object({
    people: z.array(Person).min(1).max(5),
    from: IsoDateSchema,
    to: IsoDateSchema,
    purpose: z
      .string()
      .meta({ example: "launch", description: "launch, signing, move or general" }),
    top_n: z.int().min(1).max(50).optional(),
    ...Common,
  })
  .meta({ id: "DatesRequest" });

export const DiffBody = z
  .object({
    person: Person,
    a: RuleProfileRef.unwrap(),
    b: RuleProfileRef.unwrap(),
    as_of: Common.as_of,
  })
  .meta({ id: "RulesDiffRequest" });

export const ReportBody = z
  .object({ person: Person, modules: z.array(z.string()).optional(), ...Common })
  .meta({ id: "ReportRequest" });

/** Most responses are engine results; their full shapes are the engine's TypeScript types. */
export const Result = z.record(z.string(), z.unknown()).meta({ id: "Result" });
