// Lists screen strings in apps/web/src that have no Tamil entry in src/i18n/ta.ts.
// Run by `pnpm lint`. It finds t("...") calls, and strings inside lists marked
// with /* i18n */ ... as const (table rows, questions and answers). A string it
// cannot see shows in English, never broken.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = join(import.meta.dirname, "..", "src");
const files = [];
const walk = (d) => {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.tsx?$/.test(f) && !p.endsWith(join("i18n", "ta.ts"))) files.push(p);
  }
};
walk(root);

const QUOTED = /"((?:[^"\\]|\\.)*)"/g;
const unquote = (s) => JSON.parse(`"${s}"`);
// Ids, paths and codes (complete, /practitioner, NE) are not shown as words, so they need no Tamil.
const isCode = (s) => /^[a-z0-9_./-]*$/.test(s) || /^[A-Z]{1,2}$/.test(s);

const ta = readFileSync(join(root, "i18n", "ta.ts"), "utf8");
const keys = new Set();
for (const m of ta.matchAll(/^\s*(?:"((?:[^"\\]|\\.)*)"|([A-Za-z_$][\w$]*))\s*:/gm))
  keys.add(m[1] !== undefined ? unquote(m[1]) : m[2]);

const used = new Map();
for (const f of files) {
  const src = readFileSync(f, "utf8");
  for (const m of src.matchAll(/\bt\(\s*"((?:[^"\\]|\\.)*)"/g)) used.set(unquote(m[1]), f);
  for (const block of src.matchAll(/\/\* i18n \*\/([\s\S]*?)as const/g))
    for (const m of block[1].matchAll(QUOTED)) if (!isCode(m[1])) used.set(unquote(m[1]), f);
}

const missing = [...used.keys()].filter((k) => !keys.has(k));
if (missing.length) {
  console.error(`${missing.length} screen strings have no Tamil yet:`);
  for (const k of missing) console.error(`  ${JSON.stringify(k)}  (${relative(root, used.get(k))})`);
  process.exit(1);
}
console.log(`Tamil: all ${used.size} screen strings translated.`);
