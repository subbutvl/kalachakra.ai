import type { Block, ReportDocument } from "./document.js";
import type { OverlaySchema } from "./document.js";
import type { z } from "zod";

type ParsedOverlay = z.output<typeof OverlaySchema>;

/**
 * Applies a practitioner's edit overlay at build time (phase 1 spec 6.2, 8).
 * Replaced paragraphs and added notes are marked as the practitioner's own
 * words. Edits whose section or block no longer exists are listed as
 * "needs attention" instead of being dropped silently.
 */
export function applyOverlay(doc: ReportDocument, overlay: ParsedOverlay): ReportDocument {
  const sections = doc.sections.map((s) => ({ ...s, blocks: [...s.blocks] }));
  const needs: ReportDocument["needs_attention"] = [];
  const hidden = new Set<string>();

  for (const edit of overlay.edits) {
    const s = sections.find((x) => x.id === edit.section);
    if (!s) {
      needs.push(edit);
      continue;
    }
    if (edit.action === "hide") {
      if (!edit.block) {
        hidden.add(s.id);
        continue;
      }
      const i = s.blocks.findIndex((b) => b.kind === "p" && b.id === edit.block);
      if (i < 0) needs.push(edit);
      else s.blocks.splice(i, 1);
      continue;
    }
    if (edit.action === "replace") {
      const i = s.blocks.findIndex((b) => b.kind === "p" && b.id === edit.block);
      if (i < 0) {
        needs.push(edit);
        continue;
      }
      const old = s.blocks[i] as Extract<Block, { kind: "p" }>;
      s.blocks[i] = { ...old, text: edit.text, source: "practitioner" };
      continue;
    }
    // add_note
    const note: Block = {
      kind: "p",
      id: `note.${s.id}.${s.blocks.length}`,
      text: edit.text,
      source: "practitioner",
      note: true,
    };
    if (!edit.after) {
      s.blocks.push(note);
      continue;
    }
    const i = s.blocks.findIndex((b) => b.kind === "p" && b.id === edit.after);
    if (i < 0) needs.push(edit);
    else s.blocks.splice(i + 1, 0, note);
  }

  let visible = sections.filter((s) => !hidden.has(s.id));
  if (overlay.order?.length) {
    const rank = (id: string) => {
      const k = overlay.order!.indexOf(id);
      return k < 0 ? Number.MAX_SAFE_INTEGER : k;
    };
    visible = [...visible].sort((a, b) => rank(a.id) - rank(b.id) || a.number - b.number);
  }
  visible = visible.map((s, i) => ({ ...s, number: i + 1 }));
  const out: ReportDocument = { ...doc, sections: visible, needs_attention: needs };
  if (overlay.status) out.status = overlay.status;
  return out;
}
