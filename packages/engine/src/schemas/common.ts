import { z } from "zod";

/** The nine planets, in the fixed number order 1 Sun to 9 Mars (rules spec 3.4). */
export const PLANETS = [
  "sun",
  "moon",
  "jupiter",
  "rahu",
  "mercury",
  "venus",
  "ketu",
  "saturn",
  "mars",
] as const;
export const PlanetSchema = z.enum(PLANETS);
export type Planet = z.infer<typeof PlanetSchema>;

/** The seven classical planets that have a row in the friendship table. */
export const CLASSICAL_PLANETS = [
  "sun",
  "moon",
  "jupiter",
  "mercury",
  "venus",
  "saturn",
  "mars",
] as const;
export const ClassicalPlanetSchema = z.enum(CLASSICAL_PLANETS);
export type ClassicalPlanet = z.infer<typeof ClassicalPlanetSchema>;

export const DigitSchema = z.int().min(1).max(9);
export type Digit = z.infer<typeof DigitSchema>;

export const MASTER_NUMBERS = [11, 22, 33] as const;
export const MasterNumberSchema = z.union([z.literal(11), z.literal(22), z.literal(33)]);
export type MasterNumber = z.infer<typeof MasterNumberSchema>;

export const LetterSystemSchema = z.enum(["chaldean", "pythagorean"]);
export type LetterSystem = z.infer<typeof LetterSystemSchema>;

export const FlagSchema = z.enum([
  "master",
  "karmic_debt",
  "unfavourable_compound",
  "shared_loshu_gap",
]);
export type Flag = z.infer<typeof FlagSchema>;

/**
 * What every numeric result carries (phase 1 spec 4.2): the value, its full
 * reduction chain, and how it was produced.
 */
export const NumberResultSchema = z.object({
  /** The number as read: 1 to 9, or a kept master 11, 22, 33. */
  value: z.int().min(0),
  /** Full working, starting value first, e.g. [28, 10, 1]. */
  chain: z.array(z.int().min(0)).min(1),
  /** Final single digit (equals value unless a master was kept). */
  reduced: z.int().min(0).max(9),
  /** First master number met in the chain, kept or not. */
  master: MasterNumberSchema.optional(),
  /** Compound (10 to 52) where the module uses one. */
  compound: z.int().min(10).optional(),
  trace: z.array(z.string()).optional(),
  rule_refs: z.array(z.string()).optional(),
  text_keys: z.array(z.string()).optional(),
  flags: z.array(FlagSchema).optional(),
});
export type NumberResult = z.infer<typeof NumberResultSchema>;
