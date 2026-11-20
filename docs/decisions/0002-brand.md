# 0002. Brand colours and type

- Status: accepted (20 Nov 2026). Replaces the neutral placeholder theme in the phase 1 spec.
- Applied in: `packages/ui` (M6) and the report templates (M5).

| Token   | Value     | Use                             |
| ------- | --------- | ------------------------------- |
| `white` | `#FFFFFF` | Page background                 |
| `sand`  | `#E8D4B6` | Soft surfaces, dividers         |
| `gold`  | `#D8A250` | Accent, highlights, key numbers |
| `ink`   | `#1F2628` | Text, dark surfaces             |

| Role              | Font            |
| ----------------- | --------------- |
| Headings          | Aboreto         |
| Body              | Poppins         |
| Labels and badges | Geist           |
| Tamil report text | Noto Sans Tamil |

Aboreto, Poppins and Geist have no Tamil glyphs, so Tamil text in reports uses Noto Sans Tamil
(as the phase 1 spec already planned for the PDF), with Noto Sans Devanagari ready for Hindi later.
All fonts are embedded in the PDF.
