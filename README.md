# Kalachakra

A numerology engine and web app that produces long-form personal reports (Vedic, Chaldean,
Pythagorean, Lo Shu and Kua) in English and Tamil, with a Customer mode and a Practitioner
simulation mode.

Phase 1 runs locally only: no logins, no database, no deployment.

- Rules spec v1.0 (approved 20 Nov 2026): [Benchmark Analysis and Rules Spec](https://claude.ai/artifact/JKVsWsSt9KZY1ztngnbRgK)
- Build spec: [Phase 1 Functional and Technical Spec](https://claude.ai/artifact/SHccpyF2aGhcU7UwaYEoZ2)

## Layout

| Part              | What it is                                                                 | Status |
| ----------------- | -------------------------------------------------------------------------- | ------ |
| `packages/engine` | `@kalachakra/engine`: pure calculation. No database, network, clock or UI. | M1     |
| `packages/rules`  | `@kalachakra/rules`: rules v1.0 as JSON data, rule profiles, JSON Schemas  | M1     |
| `packages/texts`  | `@kalachakra/texts`: interpretation library, English and Tamil             | M5     |
| `packages/report` | `@kalachakra/report`: report builder and PDF                               | M5     |
| `packages/ui`     | `@kalachakra/ui`: shared shadcn/ui components and brand tokens             | M6     |
| `apps/api`        | Thin Hono API on Node, port 8787                                           | M4     |
| `apps/web`        | Next.js 15 web app, port 3000                                              | M6, M7 |

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

`pnpm dev` (API and web together) arrives with milestones 4 and 6.

## Changing rules

Rules are data, not code. Edit the JSON in `packages/rules`, then follow
[docs/rules-change-process.md](docs/rules-change-process.md). Every rules file is validated
against the engine's schemas on load and in the tests.
