# Architecture

A request runs top to bottom:

```
apps/web  ──HTTP JSON──▶  apps/api  ──▶  packages/engine  ──▶  packages/report  ──▶ JSON or PDF
                                            ▲       ▲                ▲
                                 packages/rules   (rule profile)   packages/texts
```

Phase 2 attaches a database, file storage, payments and accounts **behind the API only**, so the
engine and report builder never change when they arrive.

## Layers and rules of dependency

| Layer             | May import                           | Never                                        |
| ----------------- | ------------------------------------ | -------------------------------------------- |
| `packages/engine` | `zod`                                | Node built-ins, network, clock, our packages |
| `packages/rules`  | nothing (data only)                  | code with logic                              |
| `packages/texts`  | nothing (data only)                  | code with logic                              |
| `packages/report` | engine, texts                        | the API, the web app                         |
| `apps/api`        | engine, rules, texts, report         | the web app                                  |
| `apps/web`        | the API over HTTP; engine types only | engine internals                             |

The engine's purity is enforced by ESLint (`eslint.config.js`): no `node:*` imports, no
`@kalachakra/*` imports, no `fetch`, no `Math.random`, no `Date.now()` or `new Date()`.

## The engine contract

- Every function is synchronous and deterministic: the same input and rule profile always give
  the same output. Today's date is passed in as `as_of`.
- Rule data is passed in. `resolveRules(catalog, profile)` validates a rules version, merges a
  rule profile over its defaults and records where every setting came from. Modules take the
  resolved rules as an argument and never read files.
- Zod schemas in `packages/engine/src/schemas` are the single source of truth for every input,
  output and rules file. The JSON Schemas in `packages/rules/schema` are generated from them
  (`pnpm --filter @kalachakra/engine gen:schemas`), and a test fails if they are stale.
- Every numeric result carries its value, full reduction chain, a plain-words trace, the rule
  settings that produced it, the text keys that apply, and flags (phase 1 spec 4.2).

## How splitting works later

`packages/engine` plus `packages/rules` can be published as an npm package or wrapped as its own
service; `apps/api` gets a database and accounts; `apps/web` deploys on its own. Because the web
only talks to the API over HTTP, and the API only calls the engine's public `index.ts`, none of
these moves needs a rewrite.
