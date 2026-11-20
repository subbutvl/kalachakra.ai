// How full each section's pages are, for report HTML files written by `pnpm report --html`.
// Prints, per section, the pages it takes and how much of its last page is used.
//
//   node packages/report/scripts/measure.mjs <report.html> [more.html ...]
import { existsSync, readFileSync } from "node:fs";
import { basename } from "node:path";
import { chromium } from "playwright-core";

// A4 less the PDF margins (18 mm top, 20 mm bottom, 16 mm each side), in CSS pixels.
const MM = 96 / 25.4;
const WIDTH = Math.round(178 * MM);
const HEIGHT = 259 * MM;

const exe = [
  process.env.KALACHAKRA_CHROME,
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "/opt/pw-browsers/chromium",
  "/usr/bin/chromium",
].find((p) => p && existsSync(p));

const browser = await chromium.launch({ executablePath: exe, headless: true });
const page = await browser.newPage({ viewport: { width: WIDTH, height: 1200 } });
await page.emulateMedia({ media: "print" });
for (const file of process.argv.slice(2)) {
  await page.setContent(readFileSync(file, "utf8"), { waitUntil: "load" });
  const rows = await page.$$eval(".kc-section", (els) =>
    els.map((el) => ({ id: el.id, h: el.getBoundingClientRect().height })),
  );
  let total = 2; // cover and contents
  console.log(`\n${basename(file)}`);
  for (const r of rows) {
    const pages = Math.max(1, Math.ceil(r.h / HEIGHT - 0.02));
    total += pages;
    const last = Math.round(((r.h / HEIGHT) % 1 || 1) * 100);
    console.log(`  ${r.id.padEnd(28)} ${pages}p  last page ${String(last).padStart(3)}% full`);
  }
  console.log(`  about ${total} pages`);
}
await browser.close();
