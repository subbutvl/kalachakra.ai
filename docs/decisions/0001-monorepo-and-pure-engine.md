# 0001. One monorepo with a pure engine

- Status: accepted (20 Nov 2026, phase 1 spec)

## Context

Kalachakra needs an engine that numerologists can trust to never drift, a thin API, and a web app,
each of which may later be deployed or licensed on its own.

## Decision

- One pnpm + Turborepo monorepo in strict TypeScript.
- `packages/engine` is pure calculation with Zod as its only dependency. It takes rule data and
  dates as arguments, so the same input always gives the same output, in Node or in a browser.
- Rules and interpretation texts are versioned JSON data with rule profiles, never code.
- Zod schemas are the single source of truth; JSON Schemas for reviewers' editors are generated.

## Consequences

- Splitting later (engine as a package or service, API with a database, web on its own host)
  needs no rewrite.
- Purity is enforced by lint rules, not by convention.
- Tooling note: TypeScript is pinned to 6.0 because typescript-eslint does not yet support
  TypeScript 7 (the native compiler).
