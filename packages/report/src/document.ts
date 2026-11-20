import { z } from "zod";

/**
 * The report document: what the report builder produces and what both the
 * screen and the PDF render (phase 1 spec, section 8). It is plain JSON, so
 * the API can return it as is (/v1/report).
 */

export type VisualType =
  | "loshu"
  | "birth_chart"
  | "kua"
  | "year_wheel"
  | "months"
  | "timeline"
  | "ten_years"
  | "flow"
  | "compatibility"
  | "triangle";

export type Block =
  | { kind: "p"; id: string; text: string; source: "engine" | "practitioner"; note?: boolean }
  | { kind: "h3"; text: string }
  | { kind: "facts"; rows: { label: string; value: string; detail?: string }[] }
  | { kind: "list"; items: string[] }
  | { kind: "table"; head: string[]; rows: string[][] }
  | { kind: "visual"; visual: VisualType; data: unknown; caption?: string }
  | { kind: "how"; text: string };

export interface Section {
  id: string;
  /** Number in the table of contents (1 to 30, add-ons continue after). */
  number: number;
  part: string;
  title: string;
  /** Target pages, from the rules spec table of contents. */
  pages: number;
  blocks: Block[];
}

export interface Branding {
  name?: string;
  title?: string;
  phone?: string;
  email?: string;
  website?: string;
  /** A data: URL. */
  logo?: string;
  signature?: string;
}

export const OverlayEditSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("replace"), section: z.string(), block: z.string(), text: z.string().min(1) }),
  z.object({ action: z.literal("add_note"), section: z.string(), after: z.string().optional(), text: z.string().min(1) }),
  z.object({ action: z.literal("hide"), section: z.string(), block: z.string().optional() }),
]);
export type OverlayEdit = z.infer<typeof OverlayEditSchema>;

/** The practitioner's edit overlay (phase 1 spec 6.2). The engine output is never changed. */
export const OverlaySchema = z.object({
  report_id: z.string().optional(),
  status: z.enum(["draft", "reviewed", "ready"]).optional(),
  branding: z
    .object({
      name: z.string().optional(),
      title: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().optional(),
      website: z.string().optional(),
      logo: z.string().optional(),
      signature: z.string().optional(),
    })
    .optional(),
  order: z.array(z.string()).optional(),
  edits: z.array(OverlayEditSchema).default([]),
});
export type Overlay = z.input<typeof OverlaySchema>;

export interface ReportDocument {
  meta: {
    engine: string;
    rules: string;
    texts: string;
    profile: string;
    as_of: string;
    input_hash: string;
    language: "en" | "ta";
    audience: "adult" | "child";
    modules: string[];
  };
  title: string;
  subtitle: string;
  person: { name: string; dob: string };
  file_name: string;
  disclaimer: string;
  branding?: Branding;
  status?: "draft" | "reviewed" | "ready";
  sections: Section[];
  /** Overlay edits whose block no longer exists (phase 1 spec 6.2: "needs attention"). */
  needs_attention: OverlayEdit[];
  /** Labels the renderer needs (contents, page footer). */
  labels: Record<string, string>;
}
