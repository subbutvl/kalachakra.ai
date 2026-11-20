import {
  formatValue,
  type BusinessResult,
  type CompatibilityResult,
  type HouseResult,
  type MobileResult,
  type NumberResult,
  type ProfileResult,
  type VehicleResult,
} from "@kalachakra/engine";
import type { Block, Branding, Overlay, ReportDocument, Section } from "./document.js";
import { OverlaySchema } from "./document.js";
import {
  textFor,
  type Audience,
  type Language,
  type Placeholders,
  type TextLibrary,
} from "./texts.js";
import { applyOverlay } from "./overlay.js";

export interface ReportModules {
  mobile?: MobileResult;
  vehicle?: VehicleResult;
  house?: HouseResult;
  business?: BusinessResult;
  compatibility?: { result: CompatibilityResult; partner: ProfileResult };
}

export interface ReportInput {
  profile: ProfileResult;
  library: TextLibrary;
  audience: Audience;
  modules?: ReportModules;
  branding?: Branding;
  overlay?: Overlay;
}

export class MissingTextError extends Error {
  constructor(
    readonly key: string,
    readonly language: Language,
  ) {
    super(`No ${language} text for "${key}"`);
  }
}

/** Builds the full report document from engine output and the text library (phase 1 spec, section 8). */
export function buildReport(input: ReportInput): ReportDocument {
  const { profile: P, library: lib, audience } = input;
  const lang = lib.language;
  const child = audience === "child";
  const first = titleCase(P.chaldean.headline.normalised.split(" ")[0] ?? P.person.name);
  const values: Placeholders = { name: P.person.name, first_name: first };

  // ---- helpers -------------------------------------------------------------
  const text = (key: string, v: Placeholders = {}): string => {
    const s = textFor(lib, key, audience, { ...values, ...v });
    if (s === undefined) throw new MissingTextError(key, lang);
    return s;
  };
  const maybe = (key: string, v: Placeholders = {}) =>
    textFor(lib, key, audience, { ...values, ...v });
  const ui = (key: string, v: Placeholders = {}) => text(`ui.${key}`, v);
  const p = (key: string, v: Placeholders = {}): Block => ({
    kind: "p",
    id: key,
    text: text(key, v),
    source: "engine",
  });
  const pMaybe = (key: string): Block[] => {
    const s = maybe(key);
    return s === undefined ? [] : [{ kind: "p", id: key, text: s, source: "engine" }];
  };
  const h3 = (s: string): Block => ({ kind: "h3", text: s });
  const how = (lines: (string | undefined)[]): Block => ({
    kind: "how",
    text: `${ui("how_worked_out")}: ${lines
      .filter((x): x is string => Boolean(x))
      .map((x) => localiseTrace(x, ui))
      .join("; ")}`,
  });
  const v = (r: NumberResult) => formatValue(r);
  const planet = (name: string) => ui(`planet.${name}`);
  const dir = (d: string) => ui(`direction.${d}`);
  const colour = (c: string) => maybe(`ui.colour.${c.replace(/ /g, "_")}`) ?? c;
  const day = (d: string) => ui(`day.${d}`);
  const yesNo = (b: boolean) => ui(b ? "yes" : "no");

  const sections: Section[] = [];
  let n = 0;
  const section = (
    id: string,
    part: string,
    pages: number,
    blocks: Block[],
    title = ui(`section.${id}${child && maybe(`ui.section.${id}.child`) ? ".child" : ""}`),
  ) => {
    sections.push({ id, number: ++n, part: ui(`part.${part}`), title, pages, blocks });
  };

  const dn = P.date_numbers;
  const ch = P.chaldean.headline;
  const py = P.pythagorean;
  const g = P.loshu;
  const t = P.timing;
  const mul = dn.mulank.reduced;
  const bhg = dn.bhagyank.reduced;

  // ---- Opening -------------------------------------------------------------
  section("cover", "opening", 2, [
    { kind: "p", id: `summary.theme.${mul}`, text: text(`summary.theme.${mul}`), source: "engine" },
    {
      kind: "facts",
      rows: [
        { label: ui("label.mulank"), value: v(dn.mulank), detail: planet(dn.mulank.planet) },
        { label: ui("label.bhagyank"), value: v(dn.bhagyank), detail: planet(dn.bhagyank.planet) },
        {
          label: ui("label.name_number"),
          value: v(ch.name_number.number),
          detail: planet(ch.name_number.number.planet),
        },
        {
          label: ui("label.personal_year", { year: t.personal_year.year }),
          value: v(t.personal_year),
        },
        { label: ui("label.lucky_numbers"), value: P.lucky.numbers.join(", ") },
        { label: ui("label.lucky_day"), value: P.lucky.days.slice(0, 2).map(day).join(", ") },
        {
          label: ui("label.lucky_colour"),
          value: P.lucky.colours.slice(0, 2).map(colour).join(", "),
        },
        ...(P.kua
          ? [
              {
                label: ui("label.kua"),
                value: String(P.kua.value),
                detail: ui(`group.${P.kua.group}`),
              },
            ]
          : []),
      ],
    },
  ]);

  section("how_to_read", "opening", 1, [
    { kind: "p", id: "ui.how_to_read.1", text: ui("how_to_read.1"), source: "engine" },
    { kind: "p", id: "ui.how_to_read.2", text: ui("how_to_read.2"), source: "engine" },
    { kind: "p", id: "ui.how_to_read.3", text: ui("how_to_read.3"), source: "engine" },
    { kind: "p", id: "ui.disclaimer", text: ui("disclaimer"), source: "engine" },
  ]);

  section("summary", "opening", 1, [
    {
      kind: "list",
      items: [
        `${ui("label.mulank")} ${v(dn.mulank)}: ${text(`mulank.${mul}.strengths`)}`,
        `${ui("label.bhagyank")} ${v(dn.bhagyank)}: ${text(`bhagyank.${bhg}.direction`)}`,
        `${ui("label.name_number")} ${v(ch.name_number.number)}: ${text(`name_fit.${ch.fit.label}`)}`,
        `${ui("label.personal_year", { year: t.personal_year.year })} ${v(t.personal_year)}: ${text(`personal_year.${t.personal_year.value}`)}`,
      ],
    },
    h3(ui("keep_in_mind")),
    {
      kind: "list",
      items: [
        text(`mulank.${mul}.watch_outs`),
        text(`bhagyank.${bhg}.lessons`),
        g.missing.length ? text(`loshu.count.${g.missing[0]}.missing`) : ui("no_missing"),
      ],
    },
  ]);

  // ---- I. Vedic core ------------------------------------------------------
  const mulankBlocks: Block[] = [
    {
      kind: "facts",
      rows: [{ label: ui("label.mulank"), value: v(dn.mulank), detail: planet(dn.mulank.planet) }],
    },
  ];
  for (const s of ["nature", "mind", "work", "money", "health", "relationships"] as const) {
    mulankBlocks.push(
      h3(ui(`mulank_section.${s}${child && (s === "work" || s === "money") ? ".child" : ""}`)),
      p(`mulank.${mul}.${s}`),
    );
  }
  mulankBlocks.push(
    h3(ui("strengths")),
    p(`mulank.${mul}.strengths`),
    h3(ui("watch_outs")),
    p(`mulank.${mul}.watch_outs`),
  );
  mulankBlocks.push(
    h3(ui("birthday_number", { number: dn.birthday.value })),
    p(`birthday.${dn.birthday.value}`),
  );
  if (dn.master_day) mulankBlocks.push(p(`master_day.${dn.birthday.value}`));
  for (const d of dn.karmic_debt.filter((x) => dn.mulank.chain.includes(x)))
    mulankBlocks.push(p(`karmic_debt.${d}`));
  mulankBlocks.push(how(dn.mulank.trace ?? []));
  section("mulank", "vedic", 3, mulankBlocks);

  const bBlocks: Block[] = [
    {
      kind: "facts",
      rows: [
        { label: ui("label.bhagyank"), value: v(dn.bhagyank), detail: planet(dn.bhagyank.planet) },
      ],
    },
  ];
  for (const s of ["direction", "lessons", "careers", "decades"] as const) {
    bBlocks.push(
      h3(ui(`bhagyank_section.${s}${child && s === "careers" ? ".child" : ""}`)),
      p(`bhagyank.${bhg}.${s}`),
    );
  }
  if (dn.bhagyank.master) bBlocks.push(p(`master.${dn.bhagyank.master}`));
  for (const d of dn.karmic_debt.filter((x) => dn.bhagyank.chain.includes(x)))
    bBlocks.push(p(`karmic_debt.${d}`));
  bBlocks.push(how(dn.bhagyank.trace ?? []));
  section("bhagyank", "vedic", 3, bBlocks);

  const dc = P.driver_conductor;
  section("driver_conductor", "vedic", 2, [
    {
      kind: "facts",
      rows: [
        {
          label: ui("label.pair_score"),
          value: signed(dc.pair.score),
          detail: ui(`pair.${dc.pair.label}`),
        },
      ],
    },
    p(`driver_conductor.tone.${dc.pair.label}`),
    p(`driver_conductor.${dc.driver}-${dc.conductor}`),
    ...(dc.special ? pMaybe(`driver_conductor.special.${dc.special}`) : []),
    how(dc.pair.trace.map((x) => localiseTrace(x, ui))),
  ]);

  section("planets", "vedic", 2, [
    p(`planet.${dn.mulank.planet}`),
    ...(dn.bhagyank.planet !== dn.mulank.planet ? [p(`planet.${dn.bhagyank.planet}`)] : []),
    {
      kind: "table",
      head: [ui("label.number"), ui("label.planet"), ui("label.with_bhagyank")],
      rows: P.lucky.ranked.map((r) => [
        String(r.number),
        planet(r.planet),
        signed(r.bhagyank_score),
      ]),
    },
    p(`lucky.planet.${dn.mulank.planet}`),
    {
      kind: "facts",
      rows: [
        { label: ui("label.lucky_numbers"), value: P.lucky.numbers.join(", ") },
        { label: ui("label.lucky_days"), value: P.lucky.days.map(day).join(", ") },
        { label: ui("label.lucky_colours"), value: P.lucky.colours.map(colour).join(", ") },
      ],
    },
  ]);

  // ---- II. Name ------------------------------------------------------------
  const nameBlocks: Block[] = [];
  for (const nm of [ch, ...P.chaldean.others]) {
    const nn = nm.name_number;
    nameBlocks.push(h3(`${nm.normalised} (${ui(`name_kind.${nm.kind}`)})`));
    nameBlocks.push({
      kind: "table",
      head: [ui("label.letters"), ui("label.total")],
      rows: nn.letters.map((part) => [
        part.letters.map((l) => `${l.letter} ${l.value}`).join(" · "),
        String(part.total),
      ]),
    });
    nameBlocks.push({
      kind: "facts",
      rows: [
        {
          label: ui("label.name_number"),
          value: v(nn.number),
          detail: `${nn.total} → ${nn.number.chain.slice(1).join(" → ") || nn.total}`,
        },
        ...(nn.compound
          ? [
              {
                label: ui("label.compound"),
                value: String(nn.compound.value),
                detail: nn.compound.read_like
                  ? ui("read_like", { number: nn.compound.read_like })
                  : "",
              },
            ]
          : []),
        { label: ui("label.first_name"), value: v(nm.parts.first.number) },
        ...(nm.parts.surname
          ? [{ label: ui("label.surname"), value: v(nm.parts.surname.number) }]
          : []),
        ...(nm.parts.initials
          ? [
              {
                label: `${ui("label.initials")} (${nm.parts.initials.form})`,
                value: v(nm.parts.initials.number),
              },
            ]
          : []),
        {
          label: ui("label.fit"),
          value: signed(nm.fit.total),
          detail: `${ui("label.mulank")} ${signed(nm.fit.mulank)}, ${ui("label.bhagyank")} ${signed(nm.fit.bhagyank)}`,
        },
      ],
    });
    if (nm === ch) {
      nameBlocks.push(p(`name_number.${nn.number.reduced}`));
      if (nn.compound) nameBlocks.push(p(nn.compound.text_key));
      nameBlocks.push(p(`name_fit.${nm.fit.label}`));
    }
  }
  nameBlocks.push(how(ch.name_number.number.trace ?? []));
  section("name_number", "name", 3, nameBlocks);

  if (P.name_optimizer) {
    const o = P.name_optimizer;
    section("name_correction", "name", 3, [
      {
        kind: "p",
        id: "ui.name_correction.intro",
        text: ui(child ? "name_correction.intro.child" : "name_correction.intro"),
        source: "engine",
      },
      {
        kind: "facts",
        rows: [
          {
            label: ui("label.current_spelling"),
            value: o.current.name,
            detail: `${o.current.score}/100`,
          },
        ],
      },
      {
        kind: "table",
        head: [
          ui("label.spelling"),
          ui("label.score"),
          ui("label.name_number"),
          ui("label.change"),
        ],
        rows: o.suggestions.map((s) => [
          s.name,
          `${s.score}`,
          `${s.name_number}${s.compound ? ` (${s.compound})` : ""}`,
          s.edits.map((e) => localiseEdit(e, ui)).join(", "),
        ]),
      },
      h3(ui("where_to_use")),
      {
        kind: "facts",
        rows: [
          { label: ui("label.signature"), value: o.forms.signature },
          { label: ui("label.business_card"), value: o.forms.business_card },
          { label: ui("label.social_profile"), value: o.forms.social_profile },
        ],
      },
      {
        kind: "p",
        id: "ui.name_correction.note",
        text: ui("name_correction.note"),
        source: "engine",
      },
    ]);
  }

  // ---- III. Lo Shu --------------------------------------------------------
  section("loshu_grid", "loshu", 2, [
    {
      kind: "visual",
      visual: "loshu",
      data: { layout: g.layout, cells: g.cells },
      caption: ui("caption.loshu"),
    },
    {
      kind: "table",
      head: [ui("label.element"), ui("label.count")],
      rows: Object.entries(g.elements).map(([e, c]) => [ui(`element.${e}`), String(c)]),
    },
    how(g.trace.map((x) => localiseTrace(x, ui))),
  ]);
  section(
    "loshu_planes",
    "loshu",
    2,
    Object.entries(g.planes).flatMap(([name, pl]) => [
      h3(`${ui(`plane.${name}`)} (${pl.numbers.join("-")}): ${ui(`plane_state.${pl.state}`)}`),
      p(pl.text_key),
    ]),
  );
  const mr: Block[] = [];
  for (let d = 1; d <= 9; d++) {
    const c = g.cells[String(d)]!;
    if (c.band === "single") continue;
    mr.push(h3(`${d}: ${ui(`band.${c.band}`)}`), p(`loshu.count.${d}.${c.band}`));
  }
  for (const r of g.remedies) {
    mr.push(h3(ui("remedies_for", { number: r.number, direction: dir(r.direction) })));
    mr.push({ kind: "list", items: r.tags.map((tg) => text(tg.text_key)) });
  }
  if (g.remedies.length)
    mr.push({ kind: "p", id: "ui.remedy_note", text: ui("remedy_note"), source: "engine" });
  section("missing_repeated", "loshu", 3, mr);

  if (P.kua) {
    const k = P.kua;
    section("kua", "loshu", 2, [
      {
        kind: "facts",
        rows: [{ label: ui("label.kua"), value: String(k.value), detail: ui(`group.${k.group}`) }],
      },
      p(`kua.${k.value}`),
      p(`kua.group.${k.group}`),
      {
        kind: "visual",
        visual: "kua",
        data: { directions: k.directions, good: k.good, avoid: k.avoid },
        caption: ui("caption.kua"),
      },
      {
        kind: "table",
        head: [ui("label.direction"), ui("label.meaning")],
        rows: [...k.good, ...k.avoid].map((kind) => [
          `${ui(`kua_kind.${kind}`)}: ${dir(k.directions[kind]!)}`,
          text(`kua.direction.${kind}`),
        ]),
      },
      ...(k.uncertain
        ? [
            {
              kind: "p" as const,
              id: "ui.kua_uncertain",
              text: ui("kua_uncertain"),
              source: "engine" as const,
            },
          ]
        : []),
      how(k.trace.map((x) => localiseTrace(x, ui))),
    ]);
  }

  // ---- IV. Pythagorean ------------------------------------------------------
  const core: [string, NumberResult][] = [
    ["life_path", py.life_path],
    ["expression", py.expression],
    ["soul_urge", py.soul_urge],
    ["personality", py.personality],
  ];
  section("core_four", "pythagorean", 3, [
    { kind: "facts", rows: core.map(([k, r]) => ({ label: ui(`label.${k}`), value: v(r) })) },
    ...core.flatMap(([k, r]) =>
      r.value > 0 ? [h3(ui(`label.${k}`)), p(`pythagorean.${k}.${r.value}`)] : [],
    ),
    how([
      py.life_path.trace?.[1],
      `${ui("label.expression")} ${py.expression.chain.join(" → ")}`,
      `${ui("label.soul_urge")} ${py.soul_urge.chain.join(" → ")}`,
      `${ui("label.personality")} ${py.personality.chain.join(" → ")}`,
    ]),
  ]);
  section("inner_layers", "pythagorean", 2, [
    ...py.hidden_passion.values.map((x) => p(`pythagorean.hidden_passion.${x}`)),
    ...py.karmic_lessons.values.map((x) => p(`pythagorean.karmic_lesson.${x}`)),
    p(`pythagorean.subconscious.${py.subconscious_self.value}`),
    p(`pythagorean.balance.${py.balance.value}`),
    p(`pythagorean.rational_thought.${py.rational_thought.value}`),
    p(`pythagorean.cornerstone.${py.cornerstone.letter}`),
    p(`pythagorean.capstone.${py.capstone.letter}`),
    ...(py.first_vowel ? [p(`pythagorean.first_vowel.${py.first_vowel.letter}`)] : []),
  ]);
  const total = Object.values(py.planes_of_expression).reduce((s, x) => s + x.count, 0) || 1;
  section("planes_chart", "pythagorean", 2, [
    ...Object.entries(py.planes_of_expression).map(([plane, x]) =>
      p(`pythagorean.plane.${plane}.${planeLevel(x.count, total)}`),
    ),
    {
      kind: "visual",
      visual: "birth_chart",
      data: py.birth_chart,
      caption: ui("caption.birth_chart"),
    },
    ...py.birth_chart.arrows.map((a) => p(a.text_key)),
  ]);
  section("maturity", "pythagorean", 1, [
    {
      kind: "facts",
      rows: [
        { label: ui(`label.maturity_${py.maturity.system}`), value: v(py.maturity) },
        ...(py.maturity_other
          ? [
              {
                label: ui(`label.maturity_${py.maturity_other.system}`),
                value: v(py.maturity_other),
              },
            ]
          : []),
      ],
    },
    p(`pythagorean.maturity.${py.maturity.value}`),
    how(py.maturity.trace ?? []),
  ]);

  // ---- V. Life areas --------------------------------------------------------
  section("career_money", "life", 2, [p(`life.career.${bhg}`), p(`life.money.${mul}`)]);
  section("love_family", "life", 2, [p(`life.love.${mul}`), p(`life.family.${bhg}`)]);
  section("health", "life", 1, [
    p(`life.health.${mul}`),
    p(`mulank.${mul}.health`),
    { kind: "p", id: "ui.health_note", text: ui("health_note"), source: "engine" },
  ]);

  // ---- VI. Timing ---------------------------------------------------------
  section("this_year", "timing", 2, [
    {
      kind: "facts",
      rows: [
        {
          label: ui("label.personal_year", { year: t.personal_year.year }),
          value: v(t.personal_year),
        },
        { label: ui("label.universal_year"), value: v(t.universal.year) },
        { label: ui("label.essence"), value: v(t.essence) },
        ...(t.dasha.current
          ? [
              {
                label: ui("label.dasha"),
                value: String(t.dasha.current.number),
                detail: ui("ages", {
                  number: `${t.dasha.current.from_age}–${t.dasha.current.to_age}`,
                }),
              },
            ]
          : []),
      ],
    },
    p(`personal_year.${t.personal_year.value}`),
    p(`universal_year.${t.universal.year.value}`),
    p(`essence.${t.essence.value}`),
    ...(t.dasha.current ? [p(`dasha.${t.dasha.current.number}`)] : []),
    ...(t.birthday_year
      ? [
          {
            kind: "p" as const,
            id: "ui.birthday_year",
            text: ui("birthday_year", {
              number: t.birthday_year.value,
              year: t.birthday_year.from_year,
            }),
            source: "engine" as const,
          },
        ]
      : []),
    {
      kind: "visual",
      visual: "year_wheel",
      data: { current: t.personal_year.reduced },
      caption: ui("caption.year_wheel"),
    },
    how(t.personal_year.trace ?? []),
  ]);
  section("months", "timing", 2, [
    {
      kind: "visual",
      visual: "months",
      data: t.months_ahead.map((m) => ({
        label: ui(`month.${m.month}`).slice(0, 3),
        year: m.year,
        value: v(m.personal_month),
      })),
      caption: ui("caption.months"),
    },
    {
      kind: "table",
      head: [ui("label.month"), ui("label.number"), ui("label.theme")],
      rows: t.months_ahead.map((m) => [
        `${ui(`month.${m.month}`)} ${m.year}`,
        v(m.personal_month),
        text(`personal_month.${m.personal_month.value}`),
      ]),
    },
  ]);
  section("life_cycles", "timing", 2, [
    {
      kind: "visual",
      visual: "timeline",
      data: {
        pinnacles: t.pinnacles.map((s) => ({ value: v(s.number), from: s.from_age, to: s.to_age })),
        dasha: t.dasha.periods.filter((d) => d.from_age < 90),
        age: t.age,
      },
      caption: ui("caption.timeline"),
    },
    h3(ui("label.pinnacles")),
    ...t.pinnacles.map((s) => ({
      kind: "p" as const,
      id: `pinnacle.${s.number.value}`,
      text: `${ui("ages", { number: `${s.from_age}–${s.to_age ?? ""}` })}: ${text(`pinnacle.${s.number.value}`)}`,
      source: "engine" as const,
    })),
    h3(ui("label.challenges")),
    ...t.challenges.map((s) => ({
      kind: "p" as const,
      id: `challenge.${s.number.value}`,
      text: `${ui("ages", { number: `${s.from_age}–${s.to_age ?? ""}` })}: ${text(`challenge.${s.number.value}`)}`,
      source: "engine" as const,
    })),
    h3(ui("label.periods")),
    ...t.periods.map((s) => ({
      kind: "p" as const,
      id: `period.${s.number.value}`,
      text: `${ui("ages", { number: `${s.from_age}–${s.to_age ?? ""}` })}: ${text(`period.${s.number.value}`)}`,
      source: "engine" as const,
    })),
    how(t.pinnacles[0]?.number.trace ?? []),
  ]);
  section("ten_years", "timing", 1, [
    {
      kind: "visual",
      visual: "ten_years",
      data: t.next_10_years.map((y) => ({
        year: y.year,
        age: y.age,
        py: v(y.personal_year),
        pinnacle: y.pinnacle,
        dasha: y.dasha,
      })),
      caption: ui("caption.ten_years"),
    },
    {
      kind: "table",
      head: [ui("label.year"), ui("label.personal_year_short"), ui("label.theme")],
      rows: t.next_10_years.map((y) => [
        String(y.year),
        v(y.personal_year),
        text(`personal_year.${y.personal_year.value}`),
      ]),
    },
  ]);

  // ---- VII. Daily life --------------------------------------------------------
  const m = input.modules ?? {};
  if (m.mobile) {
    for (const r of m.mobile.readings) {
      section(
        "mobile",
        "daily",
        1,
        [
          {
            kind: "facts",
            rows: [
              { label: ui("label.number"), value: r.input },
              { label: ui("label.total"), value: v(r.total), detail: r.total.chain.join(" → ") },
              { label: ui("label.fit"), value: signed(r.fit.total), detail: "−6 … +6" },
              { label: ui("label.score"), value: `${r.score.value}/100` },
            ],
          },
          p(`mobile.total.${r.total.reduced}`),
          ...(r.flow
            ? [
                {
                  kind: "visual" as const,
                  visual: "flow" as const,
                  data: r.flow.pairs,
                  caption: ui("caption.flow"),
                },
              ]
            : []),
          ...(r.flow
            ? (["smooth", "neutral", "clash", "pause"] as const)
                .filter((k) => r.flow![k] > 0)
                .map((k) => p(`mobile.flow.${k}`))
            : []),
          {
            kind: "facts",
            rows: [
              { label: ui("label.fills_gaps"), value: r.counts.fills_loshu_gaps.join(", ") || "—" },
              { label: ui("label.go_easy"), value: r.counts.go_easy_present.join(", ") || "—" },
              { label: ui("label.last4"), value: `${r.last4.digits} → ${v(r.last4.total)}` },
            ],
          },
          p(`mobile.verdict.${r.score.verdict}`),
          how(r.total.trace ?? []),
        ],
        `${ui("section.mobile")}: ${r.input}`,
      );
    }
  }
  if (m.vehicle || m.house) {
    const blocks: Block[] = [];
    for (const r of m.vehicle?.readings ?? []) {
      const hd = r.headline === "full" ? r.full : r.digits_only;
      blocks.push(h3(`${ui("label.vehicle")}: ${r.registration}`));
      blocks.push({
        kind: "facts",
        rows: [
          { label: ui("label.total"), value: v(hd.total), detail: hd.total.chain.join(" → ") },
          { label: ui("label.digits_only"), value: v(r.digits_only.total) },
          { label: ui("label.score"), value: `${hd.score.value}/100` },
        ],
      });
      blocks.push(p(`vehicle.total.${hd.total.reduced}`), p(`vehicle.verdict.${hd.score.verdict}`));
    }
    for (const h of m.house?.numbers ?? []) {
      blocks.push(h3(`${ui("label.house")}: ${h.input}`));
      blocks.push({
        kind: "table",
        head: [ui("label.resident"), ui("label.fit")],
        rows: h.residents.map((r) => [r.name, signed(r.total)]),
      });
      blocks.push(p(`house.number.${h.number.reduced}`));
    }
    if (m.house?.door) {
      blocks.push(h3(ui("door_check", { direction: dir(m.house.door.direction) })));
      blocks.push({
        kind: "table",
        head: [ui("label.resident"), ui("label.kua"), ui("label.meaning")],
        rows: m.house.door.residents.map((r) => [
          r.name,
          r.kua === null ? "—" : String(r.kua),
          r.kind ? `${ui(`kua_kind.${r.kind}`)} (${yesNo(r.good === true)})` : "—",
        ]),
      });
    }
    section("vehicle_house", "daily", 1, blocks);
  }
  section("lucky", "daily", 1, [
    p(`lucky.planet.${dn.mulank.planet}`),
    {
      kind: "facts",
      rows: [
        { label: ui("label.lucky_numbers"), value: P.lucky.numbers.join(", ") },
        { label: ui("label.lucky_days"), value: P.lucky.days.map(day).join(", ") },
        { label: ui("label.lucky_colours"), value: P.lucky.colours.map(colour).join(", ") },
        {
          label: ui("label.lucky_dates"),
          value: Array.from({ length: 31 }, (_, i) => i + 1)
            .filter((d) => P.lucky.numbers.includes(((d - 1) % 9) + 1))
            .join(", "),
        },
      ],
    },
    { kind: "p", id: "ui.lucky.how", text: ui("lucky.how"), source: "engine" },
  ]);

  // ---- Closing ------------------------------------------------------------
  const remedyItems = g.remedies.flatMap((r) =>
    r.tags.map((tg) => `${r.number} · ${text(tg.text_key)}`),
  );
  section("remedies", "closing", 1, [
    remedyItems.length
      ? { kind: "list", items: remedyItems }
      : { kind: "p", id: "ui.no_missing", text: ui("no_missing"), source: "engine" },
    { kind: "p", id: "ui.remedy_note", text: ui("remedy_note"), source: "engine" },
  ]);
  section("appendix", "closing", 2, [
    {
      kind: "table",
      head: [ui("label.number"), ui("label.working")],
      rows: [
        [ui("label.mulank"), (dn.mulank.trace ?? []).map((x) => localiseTrace(x, ui)).join("; ")],
        [
          ui("label.bhagyank"),
          (dn.bhagyank.trace ?? []).map((x) => localiseTrace(x, ui)).join("; "),
        ],
        [
          ui("label.name_number"),
          (ch.name_number.number.trace ?? []).map((x) => localiseTrace(x, ui)).join("; "),
        ],
        [
          ui("label.life_path"),
          (py.life_path.trace ?? []).map((x) => localiseTrace(x, ui)).join("; "),
        ],
        [
          ui("label.expression"),
          (py.expression.trace ?? []).map((x) => localiseTrace(x, ui)).join("; "),
        ],
        [
          ui("label.maturity_pythagorean"),
          (py.maturity.trace ?? []).map((x) => localiseTrace(x, ui)).join("; "),
        ],
        [ui("section.loshu_grid"), g.trace.map((x) => localiseTrace(x, ui)).join("; ")],
        ...(P.kua
          ? [[ui("label.kua"), P.kua.trace.map((x) => localiseTrace(x, ui)).join("; ")]]
          : []),
        [
          ui("label.personal_year", { year: t.personal_year.year }),
          (t.personal_year.trace ?? []).map((x) => localiseTrace(x, ui)).join("; "),
        ],
        [
          ui("label.pinnacles"),
          (t.pinnacles[0]?.number.trace ?? []).map((x) => localiseTrace(x, ui)).join("; "),
        ],
      ],
    },
    {
      kind: "facts",
      rows: [
        { label: ui("label.engine_version"), value: P.meta.engine },
        { label: ui("label.rules_version"), value: `${P.meta.rules} (${P.meta.profile})` },
        { label: ui("label.texts_version"), value: lib.version },
        { label: ui("label.input_hash"), value: P.meta.input_hash.slice(0, 23) + "…" },
      ],
    },
  ]);
  section("glossary", "closing", 1, [
    {
      kind: "list",
      items: [
        "mulank",
        "bhagyank",
        "chaldean",
        "pythagorean",
        "compound",
        "master_number",
        "karmic_debt",
        "loshu",
        "kua",
        "personal_year",
        "pinnacle",
        "dasha",
      ].map((k) => text(`glossary.${k}`)),
    },
    { kind: "p", id: "ui.closing", text: ui("closing"), source: "engine" },
    { kind: "p", id: "ui.disclaimer", text: ui("disclaimer"), source: "engine" },
  ]);

  // ---- Add-ons ------------------------------------------------------------
  if (m.compatibility) {
    const c = m.compatibility.result;
    const q = m.compatibility.partner;
    section("compatibility", "addons", 8, [
      {
        kind: "facts",
        rows: [
          { label: ui("label.score"), value: `${c.score}/100`, detail: ui(`band.${c.band}`) },
          { label: ui("label.relationship"), value: ui(`relationship.${c.relationship}`) },
        ],
      },
      p(`compatibility.band.${c.band}`),
      p(`compatibility.${c.relationship}.${c.band}`),
      {
        kind: "visual",
        visual: "compatibility",
        data: c.components.map((x) => ({
          id: x.id,
          label: ui(`component.${x.id}`),
          points: x.points,
          weight: x.weight,
        })),
        caption: ui("caption.compatibility"),
      },
      ...c.components.map((x) => ({
        kind: "p" as const,
        id: `compatibility.component.${x.id}`,
        text: `${text(`compatibility.component.${x.id}`)} (${x.points}/${x.weight})`,
        source: "engine" as const,
      })),
      h3(ui("both_profiles")),
      {
        kind: "table",
        head: ["", c.a, c.b],
        rows: [
          [ui("label.mulank"), v(P.date_numbers.mulank), v(q.date_numbers.mulank)],
          [ui("label.bhagyank"), v(P.date_numbers.bhagyank), v(q.date_numbers.bhagyank)],
          [
            ui("label.name_number"),
            v(P.chaldean.headline.name_number.number),
            v(q.chaldean.headline.name_number.number),
          ],
          [ui("label.life_path"), v(P.pythagorean.life_path), v(q.pythagorean.life_path)],
          [ui("label.kua"), P.kua ? String(P.kua.value) : "—", q.kua ? String(q.kua.value) : "—"],
        ],
      },
      p(`driver_conductor.${P.date_numbers.mulank.reduced}-${q.date_numbers.bhagyank.reduced}`),
      p(`compatibility.life_path.${c.life_path.kind}`),
      {
        kind: "visual",
        visual: "loshu",
        data: {
          layout: P.loshu.layout,
          cells: Object.fromEntries(
            Object.entries(c.combined_loshu.cells).map(([k, x]) => [
              k,
              { count: x.total, sources: [] },
            ]),
          ),
        },
        caption: ui("caption.combined_loshu"),
      },
      {
        kind: "facts",
        rows: [
          { label: ui("label.shared_gaps"), value: c.combined_loshu.shared_gaps.join(", ") || "—" },
        ],
      },
      {
        kind: "table",
        head: [ui("label.year"), c.a, c.b, ui("label.joint_step")],
        rows: c.timeline.map((y) => [
          String(y.year),
          String(y.a),
          String(y.b),
          yesNo(y.joint_step),
        ]),
      },
    ]);
  }
  if (m.business) {
    const b = m.business;
    section("business", "addons", 5, [
      {
        kind: "table",
        head: [ui("label.rank"), ui("label.business_name"), ui("label.total"), ui("label.fit")],
        rows: b.names.map((x) => [
          String(x.rank),
          x.input,
          `${x.counted.total} → ${x.counted.number.value}`,
          signed(x.total),
        ]),
      },
      p(`business.number.${b.names[0]!.counted.number.reduced}`),
      ...(b.names[0]!.counted.compound ? [p(b.names[0]!.counted.compound.text_key)] : []),
      ...(b.spelling_ideas.length
        ? [
            h3(ui("spelling_ideas")),
            {
              kind: "list" as const,
              items: b.spelling_ideas.map((s) => `${s.for} → ${s.name} (${signed(s.total)})`),
            },
          ]
        : []),
      {
        kind: "visual",
        visual: "triangle",
        data: { people: b.partner_triangle, name: b.names[0]!.counted.text },
        caption: ui("caption.triangle"),
      },
      h3(ui("domains")),
      {
        kind: "table",
        head: [ui("label.domain"), ui("label.total")],
        rows: b.domains.map((d) => [d.domain, `${d.with_extension.chain.join(" → ")}`]),
      },
      h3(ui("brand_kit")),
      p(`business.brand.${b.brand_kit.planet}`),
      p(`business.logo_feel.${b.brand_kit.number}`),
      {
        kind: "facts",
        rows: [
          { label: ui("label.lucky_numbers"), value: b.brand_kit.lucky_numbers.join(", ") },
          { label: ui("label.launch_days"), value: b.brand_kit.launch_days.join(", ") },
          {
            label: ui("label.launch_weekdays"),
            value: b.brand_kit.launch_weekdays.map(day).join(", "),
          },
          {
            label: ui("label.colours"),
            value: [...b.brand_kit.colours, ...b.brand_kit.support_colours].map(colour).join(", "),
          },
        ],
      },
    ]);
  }

  const doc: ReportDocument = {
    meta: {
      engine: P.meta.engine,
      rules: P.meta.rules,
      texts: lib.version,
      profile: P.meta.profile,
      as_of: P.meta.as_of,
      input_hash: P.meta.input_hash,
      language: lang,
      audience,
      modules: Object.keys(m).filter((k) => m[k as keyof ReportModules]),
    },
    title: ui(child ? "title.child" : "title.adult"),
    subtitle: ui("subtitle", { name: P.person.name }),
    person: { name: P.person.name, dob: P.person.dob },
    file_name: `Kalachakra_${P.person.name.replace(/[^A-Za-z0-9]+/g, "_").replace(/^_|_$/g, "")}_${child ? "Child" : "Complete"}_${P.meta.as_of}.pdf`,
    disclaimer: ui("disclaimer"),
    sections,
    needs_attention: [],
    labels: {
      contents: ui("contents"),
      page: ui("page"),
      calculated_with: ui("calculated_with"),
      practitioner_note: ui("practitioner_note"),
      practitioner_words: ui("practitioner_words"),
    },
  };
  const branding = input.overlay?.branding ?? input.branding;
  if (branding) doc.branding = branding;
  return input.overlay ? applyOverlay(doc, OverlaySchema.parse(input.overlay)) : doc;
}

function signed(n: number): string {
  return n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : "0";
}

function titleCase(s: string): string {
  return s.charAt(0) + s.slice(1).toLowerCase();
}

function planeLevel(count: number, total: number): "low" | "balanced" | "strong" {
  const share = count / total;
  return share < 0.15 ? "low" : share > 0.35 ? "strong" : "balanced";
}

/** Engine traces are written in English; a Tamil report keeps the numbers and swaps the words it knows. */
const TRACE_PHRASES: [string, string][] = [
  ["Date digits without zeros", "date_digits"],
  ["Kua added as a marked cell", "kua_added"],
  ["Mulank not added", "mulank_not_added"],
  ["Bhagyank added", "bhagyank_added"],
  ["Mulank added", "mulank_added"],
  ["Pythagorean expression", "pythagorean_expression"],
  ["Chaldean name number", "chaldean_name_number"],
  ["Day of birth", "day_of_birth"],
  ["Name number", "name_number"],
  ["Life path", "life_path"],
  ["All letters", "all_letters"],
  ["Consonants", "consonants"],
  ["Vowels", "vowels"],
  ["First name", "first_name"],
  ["birth day", "birth_day"],
  ["Year cutoff", "year_cutoff"],
  ["solar year", "solar_year"],
  ["local date", "local_date"],
  ["digit sum of", "digit_sum_of"],
  ["ends at", "ends_at"],
  ["Missing", "missing"],
  ["Female", "female"],
  ["Male", "male"],
  ["Total", "total"],
  ["Month", "month"],
  ["month", "month_lower"],
  ["Day", "day"],
  ["day", "day_lower"],
  ["year", "year"],
];

function localiseTrace(line: string, ui: (k: string) => string): string {
  if (ui("trace.lang") === "en") return line;
  let out = line;
  for (const [en, key] of TRACE_PHRASES) out = out.split(en).join(ui(`trace.${key}`));
  return out;
}

function localiseEdit(edit: string, ui: (k: string) => string): string {
  try {
    if (ui("trace.lang") === "en") return edit;
  } catch {
    return edit;
  }
  return edit;
}
