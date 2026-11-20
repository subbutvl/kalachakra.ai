// @kalachakra/report: engine output + texts → one report document, rendered
// to HTML for the screen and to PDF from the same components (phase 1 spec 8).
import { TEXTS_VERSION, textFiles } from "@kalachakra/texts";
import { loadLibrary, type Language, type TextLibrary } from "./texts.js";

export * from "./texts.js";
export * from "./document.js";
export { buildReport, MissingTextError, type ReportInput, type ReportModules } from "./assemble.js";
export { applyOverlay } from "./overlay.js";
export { catalogue, allKeys } from "./keys.js";
export { renderReportHtml, ReportView } from "./render.js";

const cache = new Map<string, TextLibrary>();

/** The validated text library for a language (cached). */
export function library(language: Language): TextLibrary {
  const hit = cache.get(language);
  if (hit) return hit;
  const files = textFiles[language];
  if (!files) throw new Error(`No text library for language "${language}"`);
  const lib = loadLibrary(TEXTS_VERSION, language, files);
  cache.set(language, lib);
  return lib;
}

export { TEXTS_VERSION };
