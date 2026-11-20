import { z } from "zod";

/**
 * The interpretation library (phase 1 spec 4.5). Text lives in
 * packages/texts/<language>/<module>.json as blocks keyed by
 * module.number.section; each block has its text, an optional child-edition
 * wording, remedy tags, a review status and the reviewer.
 */
export const LANGUAGES = ["en", "ta"] as const;
export type Language = (typeof LANGUAGES)[number];
export type Audience = "adult" | "child";

export const PLACEHOLDERS = ["name", "first_name", "number", "year", "planet", "direction", "colour", "day", "letter"] as const;
export type Placeholders = Partial<Record<(typeof PLACEHOLDERS)[number], string | number>>;

export const TextBlockSchema = z.strictObject({
  /** The adult wording; also used for the child edition unless "child" is given. */
  text: z.string().min(1),
  /** Child edition (written for parents). */
  child: z.string().min(1).optional(),
  tags: z.array(z.enum(["colour", "direction", "habit", "mantra", "fasting", "gemstone", "donation"])).optional(),
  status: z.enum(["draft", "reviewed"]),
  reviewer: z.string().optional(),
});
export type TextBlock = z.infer<typeof TextBlockSchema>;

/**
 * A block may be written as a plain string: shorthand for an adult-and-child
 * draft with no tags. A reviewer turns it into the full form to mark it reviewed.
 */
export const TextEntrySchema = z.union([z.string().min(1), TextBlockSchema]);

export const TextFileSchema = z.strictObject({
  $comment: z.string().optional(),
  language: z.enum(LANGUAGES),
  module: z.string().regex(/^[a-z_]+$/),
  blocks: z.record(z.string().regex(/^[a-z0-9_]+(\.[a-zA-Z0-9_-]+)+$/), TextEntrySchema),
});
export type TextFile = z.infer<typeof TextFileSchema>;

export interface TextLibrary {
  version: string;
  language: Language;
  blocks: Map<string, TextBlock>;
}

/** Validates the raw text files of one language and merges them into one library. */
export function loadLibrary(version: string, language: Language, files: Record<string, unknown>): TextLibrary {
  const blocks = new Map<string, TextBlock>();
  const problems: string[] = [];
  for (const [name, raw] of Object.entries(files)) {
    const parsed = TextFileSchema.safeParse(raw);
    if (!parsed.success) {
      problems.push(`${language}/${name}.json: ${parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`);
      continue;
    }
    if (parsed.data.language !== language) problems.push(`${language}/${name}.json says language ${parsed.data.language}`);
    for (const [key, entry] of Object.entries(parsed.data.blocks)) {
      const block: TextBlock = typeof entry === "string" ? { text: entry, status: "draft" } : entry;
      if (blocks.has(key)) problems.push(`${language}: key ${key} is defined twice`);
      blocks.set(key, block);
      for (const m of `${block.text} ${block.child ?? ""}`.matchAll(/\{([a-z_]+)\}/g)) {
        if (!(PLACEHOLDERS as readonly string[]).includes(m[1]!)) problems.push(`${language}: ${key} uses unknown placeholder {${m[1]}}`);
      }
    }
  }
  if (problems.length) throw new Error(`Text library ${language} is invalid:\n${problems.join("\n")}`);
  return { version, language, blocks };
}

/** Fills {placeholders}. Unknown or missing values are left visible so a review catches them. */
export function fill(text: string, values: Placeholders): string {
  return text.replace(/\{([a-z_]+)\}/g, (whole, key: string) => {
    const v = values[key as keyof Placeholders];
    return v === undefined ? whole : String(v);
  });
}

export function hasText(lib: TextLibrary, key: string): boolean {
  return lib.blocks.has(key);
}

/** The wording of a block for an audience, with placeholders filled; undefined when the key has no text. */
export function textFor(lib: TextLibrary, key: string, audience: Audience, values: Placeholders = {}): string | undefined {
  const b = lib.blocks.get(key);
  if (!b) return undefined;
  return fill(audience === "child" && b.child ? b.child : b.text, values);
}
