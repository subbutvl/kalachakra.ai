import { describe, expect, it } from "vitest";
import { computeProfile, type ProfileResult } from "../../src/index.js";
import { rules } from "../helpers.js";
import golden from "./people.json" with { type: "json" };

// Golden tests must match exactly. A change that alters any number here fails
// the build until the rules version is bumped and the example updated on purpose.

const byId = {
  "vedicpupil-compat": rules.vedicpupil,
  "house-default": rules.house,
} as const;

type Expected = (typeof golden.people)[number]["expected"]["house-default"];

function pick(p: ProfileResult) {
  const py = p.pythagorean;
  const dec = p.timing.months_ahead.find((m) => m.month === 12)!;
  return {
    mulank: { value: p.date_numbers.mulank.value, chain: p.date_numbers.mulank.chain },
    bhagyank: { value: p.date_numbers.bhagyank.value, chain: p.date_numbers.bhagyank.chain },
    karmic_debt: p.date_numbers.karmic_debt,
    chaldean: {
      total: p.chaldean.headline.name_number.total,
      chain: p.chaldean.headline.name_number.number.chain,
      parts: p.chaldean.headline.name_number.letters.map((l) => l.total),
    },
    pythagorean: {
      expression: py.expression.value,
      expression_total: py.expression.chain[0],
      soul_urge: py.soul_urge.value,
      personality: py.personality.value,
      personality_chain: py.personality.chain,
      maturity: py.maturity.value,
    },
    driver_conductor: { score: p.driver_conductor.pair.score, label: p.driver_conductor.pair.label },
    name_fit: { mulank: p.chaldean.headline.fit.mulank, bhagyank: p.chaldean.headline.fit.bhagyank },
    loshu: { inputs: p.loshu.inputs.map((i) => i.value), missing: p.loshu.missing },
    kua: p.kua?.value,
    personal_year: { value: p.timing.personal_year.value, chain: p.timing.personal_year.chain },
    personal_month_dec: dec.personal_month.value,
    pinnacles: p.timing.pinnacles.map((s) => s.number.value),
    pinnacle_ages: p.timing.pinnacles.map((s) => s.from_age),
    challenges: p.timing.challenges.map((s) => s.number.value),
    lucky: p.lucky.numbers,
  } satisfies Record<keyof Expected, unknown>;
}

for (const person of golden.people) {
  describe(`golden: ${person.person.name} (${person.source})`, () => {
    for (const [profileId, expected] of Object.entries(person.expected)) {
      it(`matches every number under ${profileId}`, () => {
        const r = byId[profileId as keyof typeof byId];
        const p = computeProfile({ person: person.person, as_of: golden.as_of }, r);
        expect(pick(p)).toEqual(expected);
      });
    }
  });
}
