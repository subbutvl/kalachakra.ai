# Rules spec v1.0

The full spec, with the benchmark analysis and the reasoning behind every decision, is the
Claude Doc [Kalachakra Numerology Engine: Benchmark Analysis and Rules Spec](https://claude.ai/artifact/JKVsWsSt9KZY1ztngnbRgK).
It was approved on 20 Nov 2026 with the recommended default for all 24 decisions.

## Where each section lives in the repository

| Spec section                | Rules data (`packages/rules/v1.0`) | Engine (`packages/engine/src`)      |
| --------------------------- | ---------------------------------- | ----------------------------------- |
| 3.1 Inputs, reduction       | `switches.json` (D1 to D3)         | `core/reduce.ts`, `core/masters.ts` |
| 3.2 Letter tables           | `letters.json`                     | `core/letters.ts`                   |
| 3.3 Date numbers            | `switches.json` (D5)               | `modules/dateNumbers.ts`            |
| 3.4 Planets and friendship  | `planets.json`, D6, D7             | `core/planets.ts`                   |
| 3.5 Chaldean names          | `compounds.json`, D8               | `modules/chaldean.ts`               |
| 3.5a Business names         | `business.json`, D22 to D24        | `modules/business.ts`               |
| 3.6 Pythagorean             | `letters.json`, D9                 | `modules/pythagorean.ts`            |
| 3.7 Lo Shu                  | `loshu.json`, D10, D11, D19        | `modules/loshu.ts`                  |
| 3.8 Kua                     | `kua.json`, D12                    | `modules/kua.ts`                    |
| 3.9 Timing                  | D13, D14                           | `modules/timing.ts`                 |
| 3.10 Name optimiser         | `optimizer.json`, D15              | `modules/nameOptimizer.ts`          |
| 3.11 Mobile, vehicle, house | `mobile.json`, D16, D17, D20, D21  | `modules/mobile.ts` etc.            |
| 3.12 Compatibility          | `compatibility.json`, D18          | `modules/compatibility.ts`          |

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

### Added in milestone 2

- **Karmic debt** (3.3) is flagged when 13, 14, 16 or 19 appears anywhere in the reduction chain of
  the day, the Bhagyank sum, the Chaldean name total, the expression or the soul urge (so 49 → 13 → 4
  is flagged).
- **Lichun day** (D12): a birth on the Lichun date with no birth time is placed in the new solar year
  and flagged; with a time, it is compared to the exact instant, and births within 20 minutes are
  flagged as uncertain. The local date uses the birth UTC offset (default +05:30).
- **Sunrise day boundary** (D2) needs the birth time, latitude and longitude; without them the civil
  date is used and the result says so.
- **Pinnacles with masters**: month, day and year are reduced with masters kept, sums use their single
  digits, and a master result is kept (Aarav's third pinnacle is 11/2 under the house default).
- **Personal months** add the calendar month to the personal year's single digit (as the benchmark's
  "5 + 12 = 17 → 8").
- **Lucky set** counts only numbers whose own planet is a friend of the Mulank's planet; Rahu and Ketu
  numbers are not added through their proxies (this reproduces the benchmark's 1, 5, 6 and 1, 2, 3, 9).
- **Name fit label**: "supported" when both pair scores are 0 or more and the compound is not
  unfavourable; "opposed" when the total is below 0; otherwise "mixed".
- **Lo Shu remedy colours** follow the missing cell's element (`element_colours` in `loshu.json`,
  marked draft).

### Added in milestone 3

- **Name optimiser** (3.10): edits apply to every word but never change a word's first letter
  (D15 lock). Consonants are not doubled at the end of a word, and H, W, X, Y and Q are never
  doubled, so ideas read like Indian spellings (this gives the benchmark's "Textilles" rather than
  "Textiless"). The readability check rejects triple letters, four consonants or three vowels in a
  row. The score's readability part is 10 × (1 − edits ÷ (max edits + 1)). With compound classes
  switched off, every compound earns the "mixed" credit.
- **Where to use each form**: the best spelling for the signature, first name and surname on a
  card, and the first name alone online.
- **Mobile score** (3.11): fit is (total + 6) ÷ 12 of its 40; flow is (smooth − clash + readable
  pairs) ÷ (2 × readable pairs) of its 30, where pairs touching 0 are not readable; digits to go
  easy on lose a share for each occurrence; Lo Shu gaps earn the share of gaps filled. Under D20
  "classic" the flow part is left out (and "element_flow" leaves the fit out), and the score is
  scaled back to 100.
- **Target totals** are the three best final numbers by Mulank and Bhagyank pair score, ties to the
  smaller number (this gives the benchmark's 5, 6, 4), narrowed to the goal digits when goals are
  given. The new-number finder keeps the first 6 digits and ranks every 4-digit ending.
- **Digits to go easy on** are digits with a negative pair score with both the Mulank and the
  Bhagyank, whether or not the number contains them.
- **Business score** (3.5a): owner and partner fits, plus the bonus (+1 by trade when a trade is
  given, else +1 for 1, 3, 5, 6), plus the compound class (+1 favourable, −1 unfavourable), plus the
  incorporation date's Bhagyank pair score. This reproduces every total in the business sample.
- **Spelling ideas** for business names are shown only when they beat the name as written.
- **House**: each resident's fit is the pair score of the house number with their Mulank plus with
  their Bhagyank (−4 to +4); the door is matched to the direction in each resident's Kua table.
- **Compatibility** (3.12): the Lo Shu share is the average of "B fills A's gaps" and "A fills B's
  gaps" (a person with no gaps counts as fully filled); life path credit is natural 100%, compatible
  60%, challenging 20%; Kua earns nothing when either person has no Kua basis. A year suits a big
  joint step when the two personal years have a positive pair score.
- **Date finder**: purpose days, weights and the 366-day range limit are in the new
  `packages/rules/v1.0/dates.json` (marked draft). Each date scores, for every person: +3 when the
  personal day suits the purpose, the personal day's pair score with the Mulank, +2 when the
  universal day is a lucky number, +1 when the date reduces to a lucky number, and −1 on a weekday
  ruled by an enemy of the Mulank's planet.
