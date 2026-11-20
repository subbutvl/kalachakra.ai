// Prints every number for a name and date (milestone 2 "you can see").
//
//   pnpm profile --name "Aarav Mehra" --dob 1991-08-14 --gender male
//   pnpm profile --name "Myra Kapoor" --dob 2016-03-09 --gender female --profile vedicpupil-compat
//
// Options: --birth-name, --as-of YYYY-MM-DD (default today), --time HH:MM,
// --profile <id> (house-default, vedicpupil-compat, sample-practitioner),
// --kua-basis male|female (with --gender unspecified), --json.
import { parseArgs } from "node:util";
import { ruleProfiles, rulesVersions } from "@kalachakra/rules";
import {
  computeProfile,
  EngineError,
  formatValue,
  monthName,
  resolveRules,
  type NumberResult,
  type PersonInput,
} from "../src/index.js";

const { values } = parseArgs({
  options: {
    name: { type: "string" },
    "birth-name": { type: "string" },
    dob: { type: "string" },
    gender: { type: "string", default: "unspecified" },
    "kua-basis": { type: "string" },
    time: { type: "string" },
    "as-of": { type: "string" },
    profile: { type: "string", default: "house-default" },
    json: { type: "boolean", default: false },
    help: { type: "boolean", default: false },
  },
});

if (values.help || !values.name || !values.dob) {
  console.log(
    'Usage: pnpm profile --name "Aarav Mehra" --dob 1991-08-14 --gender male [--profile vedicpupil-compat] [--as-of 2026-11-20] [--birth-name "..."] [--time HH:MM] [--json]',
  );
  process.exit(values.help ? 0 : 1);
}

const today = new Date();
const asOf =
  values["as-of"] ??
  `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

const person: PersonInput = {
  name: values.name,
  other_names: values["birth-name"] ? [{ kind: "birth_certificate", name: values["birth-name"] }] : [],
  dob: values.dob,
  gender: values.gender as PersonInput["gender"],
  ...(values["kua-basis"] ? { kua_basis: values["kua-basis"] as "male" | "female" } : {}),
  ...(values.time ? { birth_time: values.time } : {}),
};

try {
  const rules = resolveRules({ versions: rulesVersions, profiles: ruleProfiles }, values.profile);
  const p = computeProfile({ person, as_of: asOf }, rules);
  if (values.json) {
    console.log(JSON.stringify(p, null, 2));
    process.exit(0);
  }

  const v = (r: NumberResult) => formatValue(r);
  const chain = (r: NumberResult) => r.chain.join(" → ");
  const line = (label: string, value: string) => console.log(`  ${label.padEnd(24)} ${value}`);
  const head = (title: string) => console.log(`\n${title}`);

  console.log(`${p.person.name}, born ${p.person.dob} (${p.person.gender})`);
  console.log(`Profile ${p.meta.profile}, rules ${p.meta.rules}, engine ${p.meta.engine}, as of ${p.meta.as_of}`);
  for (const n of p.person.notes) console.log(`Note: ${n}`);

  const dn = p.date_numbers;
  head("Vedic core");
  line("Mulank (driver)", `${v(dn.mulank)}  ${dn.mulank.planet}  [${chain(dn.mulank)}]`);
  line("Bhagyank (conductor)", `${v(dn.bhagyank)}  ${dn.bhagyank.planet}  [${dn.bhagyank.trace?.[0]}]`);
  line("Birthday number", String(dn.birthday.value));
  line("Karmic debt", dn.karmic_debt.join(", ") || "none");
  const dc = p.driver_conductor;
  line("Driver–conductor", `${dc.pair.score > 0 ? "+" : ""}${dc.pair.score} ${dc.pair.label}${dc.special ? ` (special pair ${dc.special})` : ""}`);
  line("Lucky numbers", p.lucky.numbers.join(", "));
  line("Lucky days", p.lucky.days.join(", "));
  line("Lucky colours", p.lucky.colours.join(", "));

  for (const n of [p.chaldean.headline, ...p.chaldean.others]) {
    head(`Chaldean name: ${n.normalised} (${n.kind.replace("_", " ")})`);
    for (const t of n.name_number.number.trace ?? []) console.log(`  ${t}`);
    const c = n.name_number.compound;
    line("Name number", `${v(n.name_number.number)}  ${n.name_number.number.planet}`);
    if (c) line("Compound", `${c.value} ${c.name}${c.read_like ? ` (read like ${c.read_like})` : ""}${c.class ? `, ${c.class}` : ""}`);
    line("First name", `${n.parts.first.total} → ${v(n.parts.first.number)}`);
    if (n.parts.surname) line("Surname", `${n.parts.surname.total} → ${v(n.parts.surname.number)}`);
    if (n.parts.initials) line(`Initials (${n.parts.initials.form})`, `${n.parts.initials.total} → ${v(n.parts.initials.number)}`);
    line("Fit", `Mulank ${n.fit.mulank}, Bhagyank ${n.fit.bhagyank}, total ${n.fit.total} (${n.fit.label})`);
  }

  const py = p.pythagorean;
  head(`Pythagorean (${py.name})`);
  line("Life path", `${v(py.life_path)}  [${py.life_path.trace?.[1]}]`);
  line("Expression", `${v(py.expression)}  [${chain(py.expression)}]`);
  line("Soul urge", `${v(py.soul_urge)}  [${chain(py.soul_urge)}]`);
  line("Personality", `${v(py.personality)}  [${chain(py.personality)}]`);
  line(`Maturity (${py.maturity.system})`, `${v(py.maturity)}  [${py.maturity.trace?.[0]}]`);
  if (py.maturity_other) line(`Maturity (${py.maturity_other.system})`, v(py.maturity_other));
  line("Hidden passion", py.hidden_passion.values.join(", "));
  line("Karmic lessons", py.karmic_lessons.values.join(", ") || "none");
  line("Subconscious self", String(py.subconscious_self.value));
  line("Balance", v(py.balance));
  line("Rational thought", v(py.rational_thought));
  line("Cornerstone, capstone", `${py.cornerstone.letter}, ${py.capstone.letter}${py.first_vowel ? `; first vowel ${py.first_vowel.letter}` : ""}`);
  line("Planes of expression", Object.entries(py.planes_of_expression).map(([k, x]) => `${k} ${x.count}`).join(", "));
  line("Birth chart arrows", py.birth_chart.arrows.map((a) => `${a.id} ${a.kind}`).join(", ") || "none");

  const g = p.loshu;
  head("Lo Shu grid (south at top)");
  for (const row of g.layout) {
    console.log("  " + row.map((n) => {
      const c = g.cells[String(n)]!;
      const marks = c.sources.map((s) => (s === "dob" ? String(n) : s === "kua" ? `${n}k` : `${n}${s[0]}`));
      return (marks.join(" ") || "·").padEnd(14);
    }).join("|"));
  }
  console.log("  (m = Mulank, b = Bhagyank, k = Kua)");
  line("Missing", g.missing.join(", ") || "none");
  line("Repeated", g.repeated.map((n) => `${n}×${g.cells[String(n)]!.count}`).join(", ") || "none");
  line("Planes", Object.entries(g.planes).map(([k, x]) => `${k} ${x.state}`).join(", "));

  head("Kua");
  if (p.kua) {
    line("Kua", `${p.kua.value} (${p.kua.group} group, solar year ${p.kua.solar_year})`);
    line("Good directions", p.kua.good.map((k) => `${k} ${p.kua!.directions[k]}`).join(", "));
    line("Directions to avoid", p.kua.avoid.map((k) => `${k} ${p.kua!.directions[k]}`).join(", "));
  } else {
    line("Kua", "needs gender male or female, or --kua-basis");
  }

  const t = p.timing;
  head(`Timing (age ${t.age})`);
  line(`Personal year ${t.personal_year.year}`, `${v(t.personal_year)}  [${t.personal_year.trace?.[0]}]`);
  if (t.birthday_year) line("Birthday-to-birthday", `${t.birthday_year.value} (from ${t.birthday_year.from_year} birthday)`);
  line("Universal year", v(t.universal.year));
  line(`Personal month ${monthName(t.personal_month.month)}`, v(t.personal_month));
  line("Personal day", v(t.personal_day));
  line("Months ahead", t.months_ahead.map((m) => `${monthName(m.month).slice(0, 3)} ${v(m.personal_month)}`).join(", "));
  line("Pinnacles", t.pinnacles.map((s) => `${v(s.number)} (${s.from_age}–${s.to_age ?? ""})`).join(", "));
  line("Challenges", t.challenges.map((s) => v(s.number)).join(", "));
  line("Period cycles", t.periods.map((s) => `${v(s.number)} (${s.from_age}–${s.to_age ?? ""})`).join(", "));
  line("Essence", `${v(t.essence)}  [${t.transits.map((x) => x.letter).join(" ")}]`);
  if (t.dasha.current) line("Dasha", `${t.dasha.current.number} (ages ${t.dasha.current.from_age}–${t.dasha.current.to_age}), sub-period ${t.dasha.sub_period}`);
  line("Next 10 years (PY)", t.next_10_years.map((y) => `${y.year}:${v(y.personal_year)}`).join(" "));
  if (p.flags.length) {
    head("Flags");
    for (const f of p.flags) line(f.flag, `${f.where}${f.value !== undefined ? ` ${f.value}` : ""}`);
  }
  console.log(`\nInput hash ${p.meta.input_hash}`);
} catch (e) {
  if (e instanceof EngineError) {
    console.error(`Error ${e.code}${e.field ? ` (${e.field})` : ""}: ${e.message}`);
    process.exit(1);
  }
  throw e;
}
