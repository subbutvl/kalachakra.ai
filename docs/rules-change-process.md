# Changing the rules

Rules live in versioned data (`packages/rules`), not in code, so a reviewer's change is an edit
to JSON (rules spec 3.15).

1. **Propose.** A reviewer proposes a change, for example a new avoid pair, a different Rahu
   friendship, or a compound marked unfavourable.
2. **Version it.** A tweak that does not change existing results is a minor version (v1.0 to
   v1.1). A change that alters any existing result is a major version (v2.0). Copy
   `packages/rules/v1.0` to the new folder, make the edit there, and update `manifest.json`
   (version, date, approved by, changelog). Old versions are never edited.
3. **Show it.** Add a golden example under `packages/engine/test/golden` that shows the new
   behaviour. Run `pnpm test`: every golden number the change alters fails, which is the list of
   reports the change would affect.
4. **Approve and switch.** Once approved, point the house default profile's `base` at the new
   version. Every report records the rules version that made it, so old reports can be regenerated
   under either version.

## Practitioner profiles

A practitioner can run their own settings without touching the house default: a profile file in
`packages/rules/profiles` (or, in phase 1 practitioner mode, an inline custom profile) names a base
version and overrides some settings. Unknown setting names and invalid values are rejected.

## After editing any rules file

```sh
pnpm --filter @kalachakra/engine gen:schemas   # only if you changed a schema in the engine
pnpm test                                      # validates every rules file and profile
```
