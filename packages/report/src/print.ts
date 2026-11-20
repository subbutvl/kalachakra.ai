/**
 * Report styles: brand tokens (docs/decisions/0002-brand.md), A4 page layout
 * and page breaks. Fonts: Aboreto for headings, Poppins for body, Geist for
 * labels and badges; Noto Sans Tamil for Tamil text in every role.
 */
export const PRINT_CSS = `
:root {
  --kc-white: #FFFFFF;
  --kc-sand: #E8D4B6;
  --kc-gold: #D8A250;
  --kc-ink: #1F2628;
  --kc-muted: #6E7476;
  --kc-heading: "Aboreto", "Noto Sans Tamil", serif;
  --kc-body: "Poppins", "Noto Sans Tamil", sans-serif;
  --kc-label-font: "Geist", "Noto Sans Tamil", sans-serif;
}
@page { size: A4; margin: 18mm 16mm 20mm; }
* { box-sizing: border-box; }
html, body { margin: 0; background: var(--kc-white); color: var(--kc-ink); }
body { font-family: var(--kc-body); font-size: 10.5pt; line-height: 1.55; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.kc-report { max-width: 178mm; margin: 0 auto; }
h1, h2, h3, .kc-mark { font-family: var(--kc-heading); font-weight: 400; letter-spacing: 0.04em; }
[lang="ta"] h1, [lang="ta"] h2, [lang="ta"] h3 { letter-spacing: 0; font-weight: 600; }
h1 { font-size: 26pt; margin: 0 0 6mm; line-height: 1.2; }
h2 { font-size: 17pt; margin: 0 0 5mm; line-height: 1.25; }
h3 { font-size: 11.5pt; margin: 6mm 0 2mm; color: var(--kc-ink); border-bottom: 1px solid var(--kc-sand); padding-bottom: 1mm; }
p { margin: 0 0 3mm; }
ul { margin: 0 0 4mm; padding-left: 5mm; }
li { margin-bottom: 1.5mm; }
.kc-cover { min-height: 250mm; display: flex; flex-direction: column; justify-content: center; text-align: center; padding: 10mm; border: 2px solid var(--kc-gold); border-radius: 6mm; background: linear-gradient(180deg, var(--kc-white), #FBF5EC); break-after: page; }
.kc-mark { font-size: 15pt; color: var(--kc-gold); letter-spacing: 0.3em; margin-bottom: 14mm; }
.kc-logo { max-height: 22mm; margin: 0 auto 12mm; }
.kc-subtitle { font-size: 13pt; margin-bottom: 1mm; }
.kc-dob { font-family: var(--kc-label-font); color: var(--kc-muted); margin-bottom: 10mm; }
.kc-cover .kc-facts { justify-content: center; margin-top: 8mm; }
.kc-branding { margin-top: 12mm; font-family: var(--kc-label-font); font-size: 9pt; display: flex; flex-direction: column; gap: 1mm; }
.kc-contents { break-after: page; }
.kc-contents ol { list-style: none; padding: 0; columns: 2; column-gap: 10mm; }
.kc-contents li { break-inside: avoid; margin-bottom: 2mm; }
.kc-contents a { color: var(--kc-ink); text-decoration: none; }
.kc-section { break-before: page; }
.kc-section header { margin-bottom: 4mm; }
.kc-part { font-family: var(--kc-label-font); font-size: 8.5pt; text-transform: uppercase; letter-spacing: 0.12em; color: var(--kc-gold); }
.kc-secnum { display: inline-block; min-width: 9mm; font-family: var(--kc-label-font); color: var(--kc-gold); }
.kc-facts { display: flex; flex-wrap: wrap; gap: 3mm; margin: 0 0 5mm; }
.kc-fact { border: 1px solid var(--kc-sand); border-radius: 3mm; padding: 2.5mm 4mm; min-width: 38mm; background: #FDFAF5; break-inside: avoid; }
.kc-fact dt { font-family: var(--kc-label-font); font-size: 8pt; text-transform: uppercase; letter-spacing: 0.06em; color: var(--kc-muted); }
[lang="ta"] .kc-fact dt { text-transform: none; letter-spacing: 0; }
.kc-fact dd { margin: 0; display: flex; align-items: baseline; gap: 2mm; }
.kc-fact .kc-num { font-family: var(--kc-heading); font-size: 15pt; color: var(--kc-ink); }
.kc-fact small { font-family: var(--kc-label-font); font-size: 8.5pt; color: var(--kc-muted); }
table { width: 100%; border-collapse: collapse; margin: 0 0 5mm; font-size: 9.5pt; break-inside: auto; }
th { font-family: var(--kc-label-font); font-weight: 500; text-align: left; background: var(--kc-sand); padding: 1.8mm 2.5mm; }
td { border-bottom: 1px solid var(--kc-sand); padding: 1.8mm 2.5mm; vertical-align: top; }
tr { break-inside: avoid; }
.kc-figure { margin: 4mm 0 6mm; text-align: center; break-inside: avoid; }
.kc-visual { max-width: 100%; height: auto; max-height: 90mm; }
.kc-visual text { font-family: var(--kc-body); }
.kc-visual .kc-num { font-family: var(--kc-heading); }
.kc-visual .kc-label { font-family: var(--kc-label-font); }
figcaption { font-family: var(--kc-label-font); font-size: 8.5pt; color: var(--kc-muted); margin-top: 2mm; }
.kc-how { font-family: var(--kc-label-font); font-size: 8.5pt; color: var(--kc-muted); border-left: 2px solid var(--kc-gold); padding-left: 3mm; margin-top: 5mm; }
.kc-practitioner { border-left: 3px solid var(--kc-gold); background: #FBF5EC; padding: 2mm 4mm; margin: 0 0 3mm; break-inside: avoid; }
.kc-badge { display: inline-block; font-family: var(--kc-label-font); font-size: 7.5pt; text-transform: uppercase; letter-spacing: 0.08em; background: var(--kc-gold); color: var(--kc-white); border-radius: 2mm; padding: 0.5mm 2mm; margin-bottom: 1mm; }
.kc-footer { break-before: page; text-align: center; padding-top: 40mm; color: var(--kc-muted); }
.kc-signature { font-family: var(--kc-heading); font-size: 14pt; color: var(--kc-ink); }
.kc-small { font-family: var(--kc-label-font); font-size: 8pt; }
@media screen {
  body { padding: 16px; }
  .kc-section, .kc-contents, .kc-footer { break-before: auto; margin-top: 18mm; }
  .kc-cover { min-height: auto; padding: 16mm 10mm; }
}
`;
