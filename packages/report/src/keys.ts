/**
 * The catalogue of every text key the report can ask for. It is the writers'
 * checklist: the completeness test fails if any key here has no text in
 * either language, or if the library holds a key that is not here.
 */

const D = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const DM = [...D, 11, 22, 33];
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const PLANETS = ["sun", "moon", "jupiter", "rahu", "mercury", "venus", "ketu", "saturn", "mars"];

export const MULANK_SECTIONS = [
  "nature",
  "mind",
  "work",
  "money",
  "health",
  "relationships",
  "strengths",
  "watch_outs",
] as const;
export const BHAGYANK_SECTIONS = ["direction", "lessons", "careers", "decades"] as const;
export const OWN_COMPOUNDS = [
  10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 37,
  43, 51,
];
export const LOSHU_PLANES = [
  "mental",
  "emotional",
  "practical",
  "thought",
  "will",
  "action",
  "golden",
  "property",
];
export const ARROWS = ["123", "456", "789", "147", "258", "369", "159", "357"];
export const KUA_DIRECTIONS = [
  "success",
  "health",
  "relationships",
  "growth",
  "mishaps",
  "five_ghosts",
  "six_killings",
  "total_loss",
];
export const REMEDY_TAGS = [
  "colour",
  "direction",
  "habit",
  "mantra",
  "fasting",
  "gemstone",
  "donation",
];
export const COMPAT_COMPONENTS = [
  "driver_harmony",
  "conductor_harmony",
  "cross_harmony",
  "loshu_gap_filling",
  "life_path_synergy",
  "name_harmony",
  "kua_group",
];
export const GLOSSARY = [
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
];
export const LIFE_AREAS = ["career", "money", "love", "family", "health"] as const;

/** Every key, grouped by the module file it belongs to. */
export function catalogue(): Record<string, string[]> {
  const k: Record<string, string[]> = {};
  const add = (module: string, keys: string[]) => (k[module] = [...(k[module] ?? []), ...keys]);

  add(
    "mulank",
    D.flatMap((n) => MULANK_SECTIONS.map((s) => `mulank.${n}.${s}`)),
  );
  add("mulank", ["master_day.11", "master_day.22"]);
  add(
    "mulank",
    Array.from({ length: 31 }, (_, i) => `birthday.${i + 1}`),
  );
  add(
    "bhagyank",
    D.flatMap((n) => BHAGYANK_SECTIONS.map((s) => `bhagyank.${n}.${s}`)),
  );
  add("bhagyank", [
    "master.11",
    "master.22",
    "master.33",
    "karmic_debt.13",
    "karmic_debt.14",
    "karmic_debt.16",
    "karmic_debt.19",
  ]);
  add(
    "driver_conductor",
    D.flatMap((m) => D.map((b) => `driver_conductor.${m}-${b}`)),
  );
  add("driver_conductor", [
    "driver_conductor.tone.friendly",
    "driver_conductor.tone.neutral",
    "driver_conductor.tone.opposed",
  ]);
  add("driver_conductor", [
    "driver_conductor.special.4-8",
    "driver_conductor.special.8-8",
    "driver_conductor.special.4-4",
  ]);
  add(
    "planets",
    PLANETS.flatMap((p) => [`planet.${p}`, `lucky.planet.${p}`]),
  );
  add(
    "name",
    D.map((n) => `name_number.${n}`),
  );
  add("name", ["name_fit.supported", "name_fit.mixed", "name_fit.opposed"]);
  add(
    "compounds",
    OWN_COMPOUNDS.map((c) => `compound.${c}`),
  );
  for (const m of [
    "life_path",
    "expression",
    "soul_urge",
    "personality",
    "maturity",
    "balance",
    "rational_thought",
  ]) {
    add(
      "pythagorean",
      DM.map((n) => `pythagorean.${m}.${n}`),
    );
  }
  add(
    "pythagorean",
    D.map((n) => `pythagorean.hidden_passion.${n}`),
  );
  add(
    "pythagorean",
    D.map((n) => `pythagorean.karmic_lesson.${n}`),
  );
  add(
    "pythagorean",
    [0, ...D].map((n) => `pythagorean.subconscious.${n}`),
  );
  add(
    "pythagorean",
    LETTERS.map((l) => `pythagorean.cornerstone.${l}`),
  );
  add(
    "pythagorean",
    LETTERS.map((l) => `pythagorean.capstone.${l}`),
  );
  add(
    "pythagorean",
    ["A", "E", "I", "O", "U", "Y"].map((l) => `pythagorean.first_vowel.${l}`),
  );
  add(
    "pythagorean",
    ["physical", "mental", "emotional", "intuitive"].flatMap((p) =>
      ["low", "balanced", "strong"].map((l) => `pythagorean.plane.${p}.${l}`),
    ),
  );
  add(
    "pythagorean",
    ARROWS.flatMap((a) => [`pythagorean.arrow.${a}.strength`, `pythagorean.arrow.${a}.weakness`]),
  );
  add(
    "loshu",
    D.flatMap((n) =>
      ["missing", "single", "double", "triple", "four_plus"].map((b) => `loshu.count.${n}.${b}`),
    ),
  );
  add(
    "loshu",
    LOSHU_PLANES.flatMap((p) =>
      ["complete", "partial", "empty"].map((s) => `loshu.plane.${p}.${s}`),
    ),
  );
  add(
    "loshu",
    D.flatMap((n) => REMEDY_TAGS.map((t) => `loshu.remedy.${n}.${t}`)),
  );
  add(
    "kua",
    [1, 2, 3, 4, 6, 7, 8, 9].map((n) => `kua.${n}`),
  );
  add("kua", [
    "kua.group.east",
    "kua.group.west",
    ...KUA_DIRECTIONS.map((d) => `kua.direction.${d}`),
  ]);
  for (const m of [
    "personal_year",
    "personal_month",
    "personal_day",
    "universal_year",
    "pinnacle",
    "period",
    "essence",
  ]) {
    add(
      "timing",
      DM.map((n) => `${m}.${n}`),
    );
  }
  add(
    "timing",
    [0, 1, 2, 3, 4, 5, 6, 7, 8].map((n) => `challenge.${n}`),
  );
  add(
    "timing",
    D.map((n) => `dasha.${n}`),
  );
  add(
    "daily",
    D.map((n) => `mobile.total.${n}`),
  );
  add(
    "daily",
    ["keep", "keep_with_notes", "consider_second_number"].flatMap((v) => [
      `mobile.verdict.${v}`,
      `vehicle.verdict.${v}`,
    ]),
  );
  add(
    "daily",
    ["smooth", "neutral", "clash", "pause"].map((f) => `mobile.flow.${f}`),
  );
  add(
    "daily",
    D.flatMap((n) => [`vehicle.total.${n}`, `house.number.${n}`]),
  );
  add(
    "business",
    D.flatMap((n) => [`business.number.${n}`, `business.logo_feel.${n}`]),
  );
  add(
    "business",
    PLANETS.map((p) => `business.brand.${p}`),
  );
  add(
    "compatibility",
    ["excellent", "good", "workable", "needs_effort"].map((b) => `compatibility.band.${b}`),
  );
  add(
    "compatibility",
    ["couple", "business_partners", "parent_child"].flatMap((r) =>
      ["excellent", "good", "workable", "needs_effort"].map((b) => `compatibility.${r}.${b}`),
    ),
  );
  add(
    "compatibility",
    ["natural", "compatible", "challenging"].map((l) => `compatibility.life_path.${l}`),
  );
  add(
    "compatibility",
    COMPAT_COMPONENTS.map((c) => `compatibility.component.${c}`),
  );
  add(
    "life",
    LIFE_AREAS.flatMap((a) => D.map((n) => `life.${a}.${n}`)),
  );
  add(
    "summary",
    D.map((n) => `summary.theme.${n}`),
  );
  add(
    "summary",
    GLOSSARY.map((g) => `glossary.${g}`),
  );
  return k;
}

export function allKeys(): Set<string> {
  return new Set(Object.values(catalogue()).flat());
}
