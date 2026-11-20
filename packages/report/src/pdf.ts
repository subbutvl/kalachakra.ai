import { existsSync } from "node:fs";
import { chromium, type Browser } from "playwright-core";
import type { ReportDocument } from "./document.js";
import { renderReportHtml } from "./render.js";
import { embeddedFontCss } from "./fonts.js";

/**
 * Renders a report to an A4 PDF with headless Chromium (phase 1 spec 8). The
 * same HTML as the screen is used, with fonts embedded, so the two never
 * differ. No browser is downloaded: it uses KALACHAKRA_CHROME if set, else
 * Microsoft Edge or Google Chrome already installed on this computer.
 */
let browser: Promise<Browser> | undefined;

function launch(): Promise<Browser> {
  const explicit = process.env.KALACHAKRA_CHROME;
  if (explicit) return chromium.launch({ executablePath: explicit, headless: true });
  const candidates = [
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "/opt/pw-browsers/chromium",
    "/usr/bin/chromium",
    "/usr/bin/google-chrome",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ];
  const found = candidates.find((p) => existsSync(p));
  if (found) return chromium.launch({ executablePath: found, headless: true });
  return chromium.launch({ channel: "msedge", headless: true }).catch(() => chromium.launch({ channel: "chrome", headless: true }));
}

export async function renderReportPdf(doc: ReportDocument): Promise<Uint8Array> {
  browser ??= launch();
  const b = await browser;
  const page = await b.newPage();
  try {
    await page.setContent(renderReportHtml(doc, { fontCss: embeddedFontCss() }), { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    const footer = `<div style="font-family:sans-serif;font-size:7px;color:#6E7476;width:100%;padding:0 16mm;display:flex;justify-content:space-between"><span>${escape(doc.person.name)} · ${escape(doc.labels.calculated_with ?? "")}</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`;
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: "<span></span>",
      footerTemplate: footer,
      margin: { top: "18mm", bottom: "20mm", left: "16mm", right: "16mm" },
      tagged: true,
      outline: true,
    });
    return pdf;
  } finally {
    await page.close();
  }
}

/** Closes the shared browser (tests and scripts call this when done). */
export async function closePdfBrowser(): Promise<void> {
  if (!browser) return;
  const b = await browser;
  browser = undefined;
  await b.close();
}

function escape(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
