# Rules spec v1.0

The full spec, with the benchmark analysis and the reasoning behind every decision, is the
Claude Doc [Kalachakra Numerology Engine: Benchmark Analysis and Rules Spec](https://claude.ai/artifact/JKVsWsSt9KZY1ztngnbRgK).
It was approved on 20 Nov 2026 with the recommended default for all 24 decisions.

## Where each section lives in the repository

| Spec section                | Rules data (`packages/rules/v1.0`) | Engine (`packages/engine/src`)      |
| --------------------------- | ---------------------------------- | ----------------------------------- |
| 3.1 Inputs, reduction       | `switches.json` (D1 to D3)         | `core/reduce.ts`, `core/masters.ts` |
| 3.2 Letter tables           | `letters.json`                     | `core/letters.ts`                   |
| 3.3 Date numbers            | `switches.json` (D5)               | `modules/dateNumbers.ts` (M2)       |
| 3.4 Planets and friendship  | `planets.json`, D6, D7             | `core/planets.ts`                   |
| 3.5 Chaldean names          | `compounds.json`, D8               | `modules/chaldean.ts` (M2)          |
| 3.5a Business names         | `business.json`, D22 to D24        | `modules/business.ts` (M3)          |
| 3.6 Pythagorean             | `letters.json`, D9                 | `modules/pythagorean.ts` (M2)       |
| 3.7 Lo Shu                  | `loshu.json`, D10, D11, D19        | `modules/loshu.ts` (M2)             |
| 3.8 Kua                     | `kua.json`, D12                    | `modules/kua.ts` (M2)               |
| 3.9 Timing                  | D13, D14                           | `modules/timing.ts` (M2)            |
| 3.10 Name optimiser         | `optimizer.json`, D15              | `modules/nameOptimizer.ts` (M3)     |
| 3.11 Mobile, vehicle, house | `mobile.json`, D16, D17, D20, D21  | `modules/mobile.ts` etc. (M3)       |
| 3.12 Compatibility          | `compatibility.json`, D18          | `modules/compatibility.ts` (M3)     |

## The 24 decisions as settings

`packages/rules/v1.0/switches.json` holds each decision as one or more named settings with its
approved default. A rule profile overrides them by name, for example
`{"base": "v1.0", "overrides": {"loshu.include_mulank": "always"}}`. The allowed values for each
setting are defined in `packages/engine/src/schemas/settings.ts`.

## Interpretations made while encoding the spec

These are places where the spec needed one more detail to become code. Each is marked in the data
or code and is open to review:

- **Rahu and Ketu with their own proxy (D6).** A 4 paired with an 8 (Rahu read as Saturn) or a
  7 with a 9 (Ketu read as Mars) counts as the same planet and scores +2, unless the override table
  sets a view for that pair. The special-pair list (D7) still gives 4–8 its own reading.
- **Y by sound (D4)** is approximated as "Y is a vowel when it is not next to another vowel
  letter". This gives MYRA, LYNN and YVONNE a vowel Y, and YASH, RAY, PRIYA, KAVYA a consonant Y.
- **Lichun (D12)** comes from a generated table of the exact instant (UTC) for 1900 to 2100,
  accurate to about 20 minutes (`packages/rules/scripts/gen-lichun.mjs`).
- **Draft data for review**: compound classes (favourable, mixed, unfavourable), planet colours
  and the life path pair table are marked `"status": "draft"` until a numerologist reviews them.
