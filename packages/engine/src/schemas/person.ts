import { z } from "zod";

/** A date written as YYYY-MM-DD. Calendar validity (no 30 February) is checked by the engine. */
export const IsoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use the form YYYY-MM-DD");

export const OtherNameSchema = z.strictObject({
  kind: z.enum(["birth_certificate", "nickname", "married", "other"]),
  name: z.string().min(1),
});

export const BirthPlaceSchema = z.strictObject({
  label: z.string().optional(),
  /** UTC offset at birth, e.g. +05:30. Defaults to India (+05:30). */
  utc_offset: z
    .string()
    .regex(/^[+-]\d{2}:\d{2}$/)
    .optional(),
  lat: z.number().min(-90).max(90).optional(),
  lon: z.number().min(-180).max(180).optional(),
});

/** Person input (rules spec 3.1, phase 1 spec 9). */
export const PersonSchema = z.strictObject({
  /** The name in daily use: the headline name (D1). */
  name: z.string().min(1),
  other_names: z.array(OtherNameSchema).default([]),
  dob: IsoDateSchema,
  /** male, female, or "unspecified" with kua_basis chosen for Kua. */
  gender: z.enum(["male", "female", "unspecified"]),
  kua_basis: z.enum(["male", "female"]).optional(),
  birth_time: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .nullable()
    .optional(),
  birth_place: BirthPlaceSchema.nullable().optional(),
});
export type PersonInput = z.input<typeof PersonSchema>;
export type Person = z.output<typeof PersonSchema>;

export const ProfileRequestSchema = z.strictObject({
  person: PersonSchema,
  as_of: IsoDateSchema,
});
export type ProfileRequestInput = z.input<typeof ProfileRequestSchema>;
export type ProfileRequest = z.output<typeof ProfileRequestSchema>;
