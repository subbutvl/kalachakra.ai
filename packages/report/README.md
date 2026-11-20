# @kalachakra/report

Report builder (phase 1 spec 8): engine output plus the text library into one report document (`buildReport`), rendered to HTML (`renderReportHtml`, also used on screen) and to an A4 PDF (`renderReportPdf` in `./pdf`) with embedded Aboreto, Poppins, Geist and Noto Sans Tamil.

- `src/keys.ts`: the catalogue of every text key the report can ask for (the writers' checklist).
- `src/assemble.ts`: the 30 sections plus mobile, vehicle and house pages and the compatibility and business add-ons; adult and child editions.
- `src/overlay.ts`: the practitioner edit overlay (replace, add note, hide, reorder); missing blocks are listed as needing attention.
- `src/visuals.tsx`: SVG Lo Shu grid, birth chart, Kua compass, year wheel, months, timeline, ten years, flow strip, compatibility bars, partner triangle.
