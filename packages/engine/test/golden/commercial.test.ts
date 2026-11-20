import { describe, expect, it } from "vitest";
import {
  computeBusiness,
  computeMobile,
  computeProfile,
  countBusinessName,
  elementFlow,
  type PersonInput,
} from "../../src/index.js";
import { rules } from "../helpers.js";
import g from "./commercial.json" with { type: "json" };

const r = rules.vedicpupil;
const owner = computeProfile({ person: g.owner as PersonInput, as_of: g.as_of }, r);

describe("VedicPupil mobile sample: 98765 24310 for Aarav Mehra", () => {
  const m = computeMobile({ numbers: [g.mobile.number], goals: g.mobile.goals, find_for: g.mobile.number }, owner, r);
  const reading = m.readings[0]!;

  it("totals 45 → 9, compound 45 read like 27", () => {
    expect(reading.total.value).toBe(g.mobile.total.value);
    expect(reading.total.chain).toEqual(g.mobile.total.chain);
    expect(reading.compound).toMatchObject({ value: g.mobile.total.compound, read_like: g.mobile.total.read_like });
  });

  it("fits Mulank −1, Bhagyank 0, name number +2", () => {
    const { mulank, bhagyank, name_number, total } = reading.fit;
    expect({ mulank, bhagyank, name_number, total }).toEqual(g.mobile.fit);
  });

  it("reads 3 smooth, 4 neutral, 1 clash (24) and 1 pause (10)", () => {
    const f = reading.flow!;
    expect({ smooth: f.smooth, neutral: f.neutral, clash: f.clash, pause: f.pause }).toEqual(g.mobile.flow);
    expect(f.pairs.find((p) => p.kind === "clash")?.pair).toBe(g.mobile.clash_pair);
    expect(f.pairs.find((p) => p.kind === "pause")?.pair).toBe(g.mobile.pause_pair);
  });

  it("fills the Lo Shu gaps 2, 3, 7 and goes easy on 3", () => {
    expect(reading.counts.fills_loshu_gaps).toEqual(g.mobile.fills_loshu_gaps);
    expect(m.go_easy_digits).toEqual(g.mobile.go_easy_digits);
    expect(reading.counts.go_easy_present).toEqual(g.mobile.go_easy_digits);
  });

  it("targets 5, 6, 4 and drops 3 from the goals", () => {
    expect(computeMobile({ numbers: [g.mobile.number] }, owner, r).target_totals).toEqual(g.mobile.target_totals);
    expect(m.goals).toEqual(g.mobile.goals_after_drop);
  });

  it("finds endings that keep the prefix, hit a target and avoid clash pairs", () => {
    expect(m.candidates?.prefix).toBe(g.mobile.prefix);
    expect(m.candidates!.endings.length).toBeGreaterThan(0);
    for (const e of m.candidates!.endings) {
      expect(e.number.startsWith(g.mobile.prefix)).toBe(true);
      expect(m.target_totals).toContain(e.total);
    }
    // The sample's own ideas pass the same tests.
    for (const ending of g.mobile.last4_ideas) {
      const digits = [...(g.mobile.prefix + ending)].map(Number);
      expect(digits.reduce((s, d) => s + d, 0) % 9 || 9).toBe(5);
      expect(elementFlow(r, digits).some((p) => p.kind === "clash")).toBe(false);
    }
  });
});

describe("VedicPupil business sample: Loomcraft Works for Aarav Mehra and Ishaan Verma", () => {
  const partner = computeProfile({ person: g.business.partner as PersonInput, as_of: g.as_of }, r);
  const b = computeBusiness({ names: g.business.names }, owner, [partner], r);

  it("uses a partner with the sample's numbers", () => {
    expect({
      mulank: partner.date_numbers.mulank.value,
      bhagyank: partner.date_numbers.bhagyank.value,
      name_number: partner.chaldean.headline.name_number.number.value,
    }).toEqual(g.business.partner_numbers);
  });

  it("counts LOOMCRAFT 39 + WORKS 20 = 59 → 14 → 5 and fits owner +5, partner +1", () => {
    const n = b.names.find((x) => x.input === "Loomcraft Works")!;
    expect(n.counted.total).toBe(g.business.loomcraft_works.total);
    expect(n.counted.compound?.value).toBe(g.business.loomcraft_works.compound);
    expect(n.counted.number.value).toBe(g.business.loomcraft_works.number);
    expect(n.people.map((p) => p.total)).toEqual([g.business.loomcraft_works.owner_fit, g.business.loomcraft_works.partner_fit]);
  });

  it("leaves the legal suffix out of the headline and shows the counted version", () => {
    const n = b.names.find((x) => x.input === "Mehra Textiles Pvt Ltd")!;
    expect(n.counted.total).toBe(g.business.suffix.without);
    expect(n.counted.number.value).toBe(g.business.suffix.without_number);
    expect(n.other_version).toMatchObject({ kind: "with_suffix", total: g.business.suffix.with });
    expect(n.other_version?.number.value).toBe(g.business.suffix.with_number);
  });

  it("ranks the four names as the sample does", () => {
    expect(b.names.map((n) => ({ name: n.input, total: n.total }))).toEqual(g.business.ranking);
  });

  it("scores the sample's spelling ideas the same way", () => {
    for (const idea of g.business.spelling_ideas) {
      const c = countBusinessName(r, idea.name);
      const scored = computeBusiness({ names: [idea.name], spelling_ideas: 0 }, owner, [partner], r).names[0]!;
      expect(scored.total, `${idea.name} (${c.total})`).toBe(idea.total);
    }
    // Our own best idea for each of those names is at least as good as the sample's.
    const sampleFor = ["Aarav Weaves", "Mehra Textiles Pvt Ltd", "Loomcraft India"];
    g.business.spelling_ideas.forEach((idea, i) => {
      const ours = b.spelling_ideas.find((x) => x.for === sampleFor[i]);
      expect(ours, `an idea for ${sampleFor[i]}`).toBeDefined();
      expect(ours!.total).toBeGreaterThanOrEqual(idea.total);
    });
  });

  it("counts domains with the extension letters", () => {
    for (const d of g.business.domains) {
      const ours = b.domains.find((x) => x.extension === d.extension)!;
      expect(ours.domain).toBe(`loomcraftworks${d.extension}`);
      expect(ours.with_extension.chain[0]).toBe(d.total);
      expect(ours.with_extension.value).toBe(d.number);
    }
  });

  it("builds the brand kit from Mercury", () => {
    expect(b.brand_kit.day).toBe(g.business.brand_kit.day);
    expect(b.brand_kit.colours).toContain(g.business.brand_kit.colour);
    expect(b.brand_kit.lucky_numbers).toEqual(g.business.brand_kit.lucky_numbers);
    expect(b.brand_kit.launch_days).toEqual(g.business.brand_kit.launch_days);
  });
});
