import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { computeMobile, computeProfile, type PersonInput } from "../../src/index.js";
import { rules } from "../helpers.js";

// Smoke tests for real people kept on this computer only (see README.md here).
const here = dirname(fileURLToPath(import.meta.url));
const local = join(here, "people.local.json");
const file = existsSync(local) ? local : join(here, "people.local.example.json");
const data = JSON.parse(readFileSync(file, "utf8")) as {
  people: { id: string; person: PersonInput; mobiles?: string[] }[];
};

describe(`local people (${existsSync(local) ? "people.local.json" : "example file"})`, () => {
  for (const { id, person, mobiles } of data.people) {
    for (const [name, r] of Object.entries(rules)) {
      it(`${id} under ${name}`, () => {
        const p = computeProfile({ person, as_of: "2026-11-20" }, r);
        // Every name given is analysed: the daily name, and the birth certificate name when there is one.
        const birthCert = person.other_names?.find((n) => n.kind === "birth_certificate");
        expect(p.chaldean.others.length).toBe(
          birthCert && r.settings["names.analysed"] === "both" ? 1 : 0,
        );
        expect(Object.values(p.loshu.cells).reduce((s, c) => s + c.count, 0)).toBe(
          p.loshu.inputs.length,
        );
        expect(p.timing.pinnacles).toHaveLength(4);
        expect(p.name_optimizer?.suggestions.length).toBeGreaterThan(0);
        if (mobiles?.length) {
          const m = computeMobile({ numbers: mobiles }, p, r);
          for (const x of m.readings) {
            expect(x.score.value).toBeGreaterThanOrEqual(0);
            expect(x.score.value).toBeLessThanOrEqual(100);
          }
        }
      });
    }
  }
});
