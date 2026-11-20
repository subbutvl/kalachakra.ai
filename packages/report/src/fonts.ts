import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

/**
 * Embedded fonts for the PDF: Aboreto (headings), Poppins (body), Geist
 * (labels and badges) and Noto Sans Tamil. Read from the @fontsource
 * packages and inlined as data URLs, so the PDF needs no network.
 */
const require = createRequire(import.meta.url);

const FONTS: { family: string; file: string; weight: number }[] = [
  { family: "Aboreto", file: "@fontsource/aboreto/files/aboreto-latin-400-normal.woff2", weight: 400 },
  { family: "Poppins", file: "@fontsource/poppins/files/poppins-latin-400-normal.woff2", weight: 400 },
  { family: "Poppins", file: "@fontsource/poppins/files/poppins-latin-500-normal.woff2", weight: 500 },
  { family: "Poppins", file: "@fontsource/poppins/files/poppins-latin-600-normal.woff2", weight: 600 },
  { family: "Geist", file: "@fontsource/geist-sans/files/geist-sans-latin-400-normal.woff2", weight: 400 },
  { family: "Geist", file: "@fontsource/geist-sans/files/geist-sans-latin-500-normal.woff2", weight: 500 },
  { family: "Noto Sans Tamil", file: "@fontsource/noto-sans-tamil/files/noto-sans-tamil-tamil-400-normal.woff2", weight: 400 },
  { family: "Noto Sans Tamil", file: "@fontsource/noto-sans-tamil/files/noto-sans-tamil-tamil-600-normal.woff2", weight: 600 },
];

let cached: string | undefined;

export function embeddedFontCss(): string {
  if (cached) return cached;
  cached = FONTS.map((f) => {
    const data = readFileSync(require.resolve(f.file)).toString("base64");
    return `@font-face{font-family:"${f.family}";font-weight:${f.weight};font-style:normal;font-display:block;src:url(data:font/woff2;base64,${data}) format("woff2");}`;
  }).join("");
  return cached;
}
