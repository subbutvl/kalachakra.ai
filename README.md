# Kalachakra

A numerology engine and web app that produces long-form personal reports (Vedic, Chaldean,
Pythagorean, Lo Shu and Kua) in English and Tamil, with a Customer mode and a Practitioner
simulation mode.

Phase 1 runs locally only: no logins, no database, no deployment.

- Rules spec v1.0 (approved 20 Nov 2026): [Benchmark Analysis and Rules Spec](https://claude.ai/artifact/JKVsWsSt9KZY1ztngnbRgK)
- Build spec: [Phase 1 Functional and Technical Spec](https://claude.ai/artifact/SHccpyF2aGhcU7UwaYEoZ2)

## Layout

| Part              | What it is                                                                 | Status   |
| ----------------- | -------------------------------------------------------------------------- | -------- |
| `packages/engine` | `@kalachakra/engine`: pure calculation. No database, network, clock or UI. | M1 to M3 |
| `packages/rules`  | `@kalachakra/rules`: rules v1.0 as JSON data, rule profiles, JSON Schemas  | M1       |
| `packages/texts`  | `@kalachakra/texts`: interpretation library, English and Tamil             | M5       |
| `packages/report` | `@kalachakra/report`: report builder and PDF                               | M5       |
| `packages/ui`     | `@kalachakra/ui`: shared shadcn/ui components and brand tokens             | M6       |
| `apps/api`        | Thin Hono API on Node, port 8787                                           | M4       |
| `apps/web`        | Next.js 15 web app, port 3000                                              | M6, M7   |

A part never imports from a part above it: web calls the API over HTTP, the API imports the
engine, and the engine imports nothing of ours. See [docs/architecture.md](docs/architecture.md).

## Running it

Needs Node.js 22 or later and pnpm 11.

```sh
pnpm install
pnpm test            # every test
pnpm check           # type check, lint and test
pnpm --filter @kalachakra/engine test
```

Print every number for any name and date (milestone 2):

```sh
pnpm numbers --name "Aarav Mehra" --dob 1991-08-14 --gender male
pnpm numbers --name "Myra Kapoor" --dob 2016-03-09 --gender female --profile kalachakra-classic --as-of 2026-11-20
```

Options: `--birth-name "..."` (birth certificate name), `--time HH:MM`, `--profile`
(`house-default`, `kalachakra-classic`, `sample-practitioner`), `--as-of YYYY-MM-DD` (default today),
`--kua-basis male|female` (with `--gender unspecified`), `--json` (the full result).

The same command runs the commercial modules (milestone 3). For example, the benchmark mobile and
business samples:

```sh
pnpm numbers --name "Aarav Mehra" --dob 1991-08-14 --gender male --profile kalachakra-classic   --mobile "+91 98765 24310" --goal finance --goal career --find   --business "Loomcraft Works" --business "Mehra Textiles Pvt Ltd" --partner "Ishaan Verma|2003-01-04|male"
```

More options: `--vehicle "KA 05 MN 1234"`, `--flat 12B --building 45 --door E`, `--trade trade_media`,
`--incorporated YYYY-MM-DD`, `--with "Myra Kapoor|2016-03-09|female" --relationship parent_child`
(`couple`, `business_partners`, `parent_child`), and
`--dates 2026-12-01..2026-12-31 --purpose launch` (`launch`, `signing`, `move`, `general`).

Make a report PDF from the command line (milestone 5):

```sh
pnpm report --name "Aarav Mehra" --dob 1991-08-14 --gender male
pnpm report --name "Myra Kapoor" --dob 2016-03-09 --gender female --audience child --language ta
pnpm report --sample subbu --html        # a person from packages/engine/test/local/people.local.json
```

Reports go to `./reports` (git-ignored, since they hold personal details). Options: `--audience adult|child`,
`--language en|ta`, `--profile`, `--as-of`, `--mobile` and `--vehicle` (repeatable), `--html`, `--out <folder>`.
The PDF uses Microsoft Edge or Google Chrome already installed on the computer (or the browser named in
`KALACHAKRA_CHROME`); nothing is downloaded.

`pnpm dev` starts the API on http://localhost:8787 (the web app joins it in milestone 6). Open
http://localhost:8787/docs to see every endpoint and try each call in the browser. The API listens
on this computer only, allows only the web app's origin, and logs only method, path, status and
timing.

## Changing rules

Rules are data, not code. Edit the JSON in `packages/rules`, then follow
[docs/rules-change-process.md](docs/rules-change-process.md). Every rules file is validated
against the engine's schemas on load and in the tests.

## Editing the report text

Every sentence in a report comes from `packages/texts/<language>/<module>.json`. A block written as a plain
string is a draft; to mark it reviewed, turn it into `{"text": "...", "status": "reviewed", "reviewer": "Name"}`.
A `"child"` field gives the parents' wording for the child edition. `pnpm test` fails if any key the
report can ask for has no text in English or Tamil, or if a placeholder is unknown.
