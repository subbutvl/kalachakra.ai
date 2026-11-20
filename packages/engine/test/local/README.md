# Local test people

The repository is public, so real people's names, dates of birth and mobile numbers never go into
it. Put them in `people.local.json` in this folder instead: git ignores every `*.local.json` file.

- `people.local.example.json` shows the format and is used when no local file exists, so CI
  always has something to run.
- `local.test.ts` runs every person in the file through the profile (under all three rule
  profiles) and the mobile module, and checks that the results hold together.
- `pnpm numbers --sample <id>` prints every number for one of these people, for example
  `pnpm numbers --sample subbu` (their mobile numbers are read too).

These are smoke tests, not golden tests: golden tests need the numbers a trusted numerologist gives
for the person, and live in `test/golden`.
