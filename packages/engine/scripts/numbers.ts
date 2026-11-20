// Prints every number for a name and date (milestone 2 "you can see").
//
//   pnpm numbers --name "Aarav Mehra" --dob 1991-08-14 --gender male
//   pnpm numbers --name "Myra Kapoor" --dob 2016-03-09 --gender female --profile vedicpupil-compat
//
// Options: --birth-name, --as-of YYYY-MM-DD (default today), --time HH:MM,
// --profile <id> (house-default, vedicpupil-compat, sample-practitioner),
// --kua-basis male|female (with --gender unspecified), --json.
import { existsSync, readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { ruleProfiles, rulesVersions } from "@kalachakra/rules";
import {
  computeBusiness,
  computeCompatibility,
  computeHouse,
  computeMobile,
  computeProfile,
  computeVehicle,
  findDates,
  type Relationship,
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
    // Milestone 3 modules
    mobile: { type: "string", multiple: true },
    goal: { type: "string", multiple: true },
    find: { type: "boolean", default: false },
    vehicle: { type: "string", multiple: true },
    flat: { type: "string" },
    building: { type: "string" },
    door: { type: "string" },
    business: { type: "string", multiple: true },
    partner: { type: "string", multiple: true },
    trade: { type: "string" },
    incorporated: { type: "string" },
    with: { type: "string" },
    relationship: { type: "string", default: "couple" },
    dates: { type: "string" },
    purpose: { type: "string", default: "launch" },
    // A person from test/local/people.local.json (or the example file), by id.
    sample: { type: "string" },
  },
});

/** "Ishaan Verma|2003-01-04|male" → a person. */
function otherPerson(spec: string): PersonInput {
  const [name, dob, gender] = spec.split("|").map((s) => s.trim());
  if (!name || !dob)
    throw new EngineError(
      "invalid_input",
      `Write a person as "Name|YYYY-MM-DD|gender", got "${spec}".`,
    );
  return { name, dob, gender: (gender ?? "unspecified") as PersonInput["gender"] };
}

// --sample <id>: take the person (and their mobiles) from the local test file.
let sample: { person: PersonInput; mobiles?: string[] } | undefined;
if (values.sample) {
  const dir = new URL("../test/local/", import.meta.url);
  const local = new URL("people.local.json", dir);
  const file = existsSync(local) ? local : new URL("people.local.example.json", dir);
  const people = (
    JSON.parse(readFileSync(file, "utf8")) as {
      people: { id: string; person: PersonInput; mobiles?: string[] }[];
    }
  ).people;
  sample = people.find((x) => x.id === values.sample);
  if (!sample) {
    console.error(`No sample "${values.sample}" (have: ${people.map((x) => x.id).join(", ")}).`);
    process.exit(1);
  }
  if (!values.mobile?.length && sample.mobiles?.length) values.mobile = sample.mobiles;
}

if (values.help || (!sample && (!values.name || !values.dob))) {
  console.log(
    'Usage: pnpm numbers --name "Aarav Mehra" --dob 1991-08-14 --gender male [--profile vedicpupil-compat] [--as-of 2026-11-20] [--birth-name "..."] [--time HH:MM] [--json]\n' +
      "   or: pnpm numbers --sample <id>   (a person from packages/engine/test/local/people.local.json)",
  );
  process.exit(values.help ? 0 : 1);
}

const today = new Date();
const asOf =
  values["as-of"] ??
  `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

const person: PersonInput = sample?.person ?? {
  name: values.name!,
  other_names: values["birth-name"]
    ? [{ kind: "birth_certificate", name: values["birth-name"] }]
    : [],
  dob: values.dob!,
  gender: values.gender as PersonInput["gender"],
  ...(values["kua-basis"] ? { kua_basis: values["kua-basis"] as "male" | "female" } : {}),
  ...(values.time ? { birth_time: values.time } : {}),
};

try {
  const rules = resolveRules({ versions: rulesVersions, profiles: ruleProfiles }, values.profile);
  const p = computeProfile({ person, as_of: asOf }, rules);
  const others = (values.partner ?? []).map((s) =>
    computeProfile(
      { person: otherPerson(s), as_of: asOf, options: { name_suggestions: 0 } },
      rules,
    ),
  );
  const partnerWith = values.with
    ? computeProfile(
        { person: otherPerson(values.with), as_of: asOf, options: { name_suggestions: 0 } },
        rules,
      )
    : undefined;
  const modules = {
    ...(values.mobile?.length
      ? {
          mobile: computeMobile(
            {
              numbers: values.mobile,
              goals: values.goal ?? [],
              ...(values.find ? { find_for: values.mobile[0]! } : {}),
            },
            p,
            rules,
          ),
        }
      : {}),
    ...(values.vehicle?.length ? { vehicle: computeVehicle(values.vehicle, p, rules) } : {}),
    ...(values.flat || values.building
      ? {
          house: computeHouse(
            {
              ...(values.flat ? { flat: values.flat } : {}),
              ...(values.building ? { building: values.building } : {}),
              ...(values.door ? { door: values.door.toUpperCase() as "N" } : {}),
            },
            [p, ...others],
            rules,
          ),
        }
      : {}),
    ...(values.business?.length
      ? {
          business: computeBusiness(
            {
              names: values.business,
              ...(values.trade ? { trade: values.trade } : {}),
              ...(values.incorporated ? { incorporation_date: values.incorporated } : {}),
            },
            p,
            others,
            rules,
          ),
        }
      : {}),
    ...(partnerWith
      ? {
          compatibility: computeCompatibility(
            p,
            partnerWith,
            values.relationship as Relationship,
            rules,
          ),
        }
      : {}),
    ...(values.dates
      ? (() => {
          const [from, to] = values.dates.split("..");
          return {
            dates: findDates(
              { from: from!, to: to ?? from!, purpose: values.purpose },
              [p, ...others],
              rules,
            ),
          };
        })()
      : {}),
  };
  if (values.json) {
    console.log(JSON.stringify({ profile: p, ...modules }, null, 2));
    process.exit(0);
  }

  const v = (r: NumberResult) => formatValue(r);
  const chain = (r: NumberResult) => r.chain.join(" → ");
  const line = (label: string, value: string) => console.log(`  ${label.padEnd(24)} ${value}`);
  const head = (title: string) => console.log(`\n${title}`);

  console.log(`${p.person.name}, born ${p.person.dob} (${p.person.gender})`);
  console.log(
    `Profile ${p.meta.profile}, rules ${p.meta.rules}, engine ${p.meta.engine}, as of ${p.meta.as_of}`,
  );
  for (const n of p.person.notes) console.log(`Note: ${n}`);

  const dn = p.date_numbers;
  head("Vedic core");
  line("Mulank (driver)", `${v(dn.mulank)}  ${dn.mulank.planet}  [${chain(dn.mulank)}]`);
  line(
    "Bhagyank (conductor)",
    `${v(dn.bhagyank)}  ${dn.bhagyank.planet}  [${dn.bhagyank.trace?.[0]}]`,
  );
  line("Birthday number", String(dn.birthday.value));
  line("Karmic debt", dn.karmic_debt.join(", ") || "none");
  const dc = p.driver_conductor;
  line(
    "Driver–conductor",
    `${dc.pair.score > 0 ? "+" : ""}${dc.pair.score} ${dc.pair.label}${dc.special ? ` (special pair ${dc.special})` : ""}`,
  );
  line("Lucky numbers", p.lucky.numbers.join(", "));
  line("Lucky days", p.lucky.days.join(", "));
  line("Lucky colours", p.lucky.colours.join(", "));

  for (const n of [p.chaldean.headline, ...p.chaldean.others]) {
    head(`Chaldean name: ${n.normalised} (${n.kind.replace("_", " ")})`);
    for (const t of n.name_number.number.trace ?? []) console.log(`  ${t}`);
    const c = n.name_number.compound;
    line("Name number", `${v(n.name_number.number)}  ${n.name_number.number.planet}`);
    if (c)
      line(
        "Compound",
        `${c.value} ${c.name}${c.read_like ? ` (read like ${c.read_like})` : ""}${c.class ? `, ${c.class}` : ""}`,
      );
    line("First name", `${n.parts.first.total} → ${v(n.parts.first.number)}`);
    if (n.parts.surname) line("Surname", `${n.parts.surname.total} → ${v(n.parts.surname.number)}`);
    if (n.parts.initials)
      line(
        `Initials (${n.parts.initials.form})`,
        `${n.parts.initials.total} → ${v(n.parts.initials.number)}`,
      );
    line(
      "Fit",
      `Mulank ${n.fit.mulank}, Bhagyank ${n.fit.bhagyank}, total ${n.fit.total} (${n.fit.label})`,
    );
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
  line(
    "Cornerstone, capstone",
    `${py.cornerstone.letter}, ${py.capstone.letter}${py.first_vowel ? `; first vowel ${py.first_vowel.letter}` : ""}`,
  );
  line(
    "Planes of expression",
    Object.entries(py.planes_of_expression)
      .map(([k, x]) => `${k} ${x.count}`)
      .join(", "),
  );
  line(
    "Birth chart arrows",
    py.birth_chart.arrows.map((a) => `${a.id} ${a.kind}`).join(", ") || "none",
  );

  const g = p.loshu;
  head("Lo Shu grid (south at top)");
  for (const row of g.layout) {
    console.log(
      "  " +
        row
          .map((n) => {
            const c = g.cells[String(n)]!;
            const marks = c.sources.map((s) =>
              s === "dob" ? String(n) : s === "kua" ? `${n}k` : `${n}${s[0]}`,
            );
            return (marks.join(" ") || "·").padEnd(14);
          })
          .join("|"),
    );
  }
  console.log("  (m = Mulank, b = Bhagyank, k = Kua)");
  line("Missing", g.missing.join(", ") || "none");
  line("Repeated", g.repeated.map((n) => `${n}×${g.cells[String(n)]!.count}`).join(", ") || "none");
  line(
    "Planes",
    Object.entries(g.planes)
      .map(([k, x]) => `${k} ${x.state}`)
      .join(", "),
  );

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
  line(
    `Personal year ${t.personal_year.year}`,
    `${v(t.personal_year)}  [${t.personal_year.trace?.[0]}]`,
  );
  if (t.birthday_year)
    line(
      "Birthday-to-birthday",
      `${t.birthday_year.value} (from ${t.birthday_year.from_year} birthday)`,
    );
  line("Universal year", v(t.universal.year));
  line(`Personal month ${monthName(t.personal_month.month)}`, v(t.personal_month));
  line("Personal day", v(t.personal_day));
  line(
    "Months ahead",
    t.months_ahead
      .map((m) => `${monthName(m.month).slice(0, 3)} ${v(m.personal_month)}`)
      .join(", "),
  );
  line(
    "Pinnacles",
    t.pinnacles.map((s) => `${v(s.number)} (${s.from_age}–${s.to_age ?? ""})`).join(", "),
  );
  line("Challenges", t.challenges.map((s) => v(s.number)).join(", "));
  line(
    "Period cycles",
    t.periods.map((s) => `${v(s.number)} (${s.from_age}–${s.to_age ?? ""})`).join(", "),
  );
  line("Essence", `${v(t.essence)}  [${t.transits.map((x) => x.letter).join(" ")}]`);
  if (t.dasha.current)
    line(
      "Dasha",
      `${t.dasha.current.number} (ages ${t.dasha.current.from_age}–${t.dasha.current.to_age}), sub-period ${t.dasha.sub_period}`,
    );
  line(
    "Next 10 years (PY)",
    t.next_10_years.map((y) => `${y.year}:${v(y.personal_year)}`).join(" "),
  );
  if (p.flags.length) {
    head("Flags");
    for (const f of p.flags)
      line(f.flag, `${f.where}${f.value !== undefined ? ` ${f.value}` : ""}`);
  }
  if (p.name_optimizer) {
    const o = p.name_optimizer;
    head(`Name optimiser (${o.candidates_checked} spellings checked)`);
    line("Current", `${o.current.name}  ${o.current.score}/100  [${o.current.reason}]`);
    for (const s of o.suggestions) line(`${s.score}/100`, `${s.name}  [${s.reason}]`);
    line(
      "Use",
      `signature ${o.forms.signature}; card ${o.forms.business_card}; online ${o.forms.social_profile}`,
    );
  }

  const sign = (n: number) => (n > 0 ? `+${n}` : String(n));
  if (modules.mobile) {
    const m = modules.mobile;
    for (const r of m.readings) {
      head(`Mobile ${r.input}`);
      line("Total", `${r.total.trace?.[0]}  ${r.planet}`);
      line(
        "Fit",
        `Mulank ${sign(r.fit.mulank)}, Bhagyank ${sign(r.fit.bhagyank)}, name ${sign(r.fit.name_number)} = ${sign(r.fit.total)} (−6 to +6)`,
      );
      if (r.flow) {
        line(
          "Element flow",
          `${r.flow.smooth} smooth, ${r.flow.neutral} neutral, ${r.flow.clash} clash, ${r.flow.pause} pause`,
        );
        line("Pairs", r.flow.pairs.map((x) => `${x.pair} ${x.kind}`).join(", "));
      }
      line("Fills Lo Shu gaps", r.counts.fills_loshu_gaps.join(", ") || "none");
      line("Go easy on (present)", r.counts.go_easy_present.join(", ") || "none");
      line("Last 4", `${r.last4.digits}: ${r.last4.total.trace?.[0]}`);
      line("Score", `${r.score.value}/100, ${r.score.verdict.replace(/_/g, " ")}`);
    }
    head("Mobile advice");
    line("Digits to go easy on", m.go_easy_digits.join(", ") || "none");
    line("Target totals", m.target_totals.join(", "));
    for (const [g, d] of Object.entries(m.goals)) line(`Goal ${g}`, d.join(", "));
    if (m.ranked.length > 1)
      line("Ranked", m.ranked.map((x) => `${x.input} ${x.score}`).join("; "));
    if (m.candidates)
      line(
        `New endings for ${m.candidates.prefix}`,
        m.candidates.endings.map((e) => `${e.ending} (${e.total}, ${e.score})`).join(", "),
      );
  }
  if (modules.vehicle) {
    for (const r of modules.vehicle.readings) {
      head(`Vehicle ${r.registration}`);
      line("Full registration", `${r.full.total.trace?.[0]}`);
      line("Digits only", `${r.digits_only.total.chain.join(" → ")}`);
      const h = r.headline === "full" ? r.full : r.digits_only;
      line("Fit", `${sign(h.fit.total)} (−6 to +6)`);
      line("Score", `${h.score.value}/100, ${h.score.verdict.replace(/_/g, " ")}`);
    }
  }
  if (modules.house) {
    for (const n of modules.house.numbers) {
      head(`House ${n.input}`);
      line("Number", `${n.number.trace?.[0]}`);
      for (const r of n.residents)
        line(r.name, `Mulank ${sign(r.mulank)}, Bhagyank ${sign(r.bhagyank)} = ${sign(r.total)}`);
    }
    if (modules.house.door) {
      for (const r of modules.house.door.residents) {
        line(
          `Door ${modules.house.door.direction}: ${r.name}`,
          r.kua === null ? "no Kua" : `Kua ${r.kua}: ${r.kind} (${r.good ? "good" : "avoid"})`,
        );
      }
    }
  }
  if (modules.business) {
    const b = modules.business;
    head("Business names");
    for (const n of b.names) {
      line(
        `${n.rank}. ${n.input}`,
        `${n.counted.text} ${n.counted.total} → ${n.counted.number.value}; total ${sign(n.total)} (people ${n.people.map((x) => sign(x.total)).join(", ")}, bonus ${sign(n.bonus.value)}${n.compound_class ? `, compound ${sign(n.compound_class)}` : ""}${n.incorporation ? `, incorporation ${sign(n.incorporation.score)}` : ""})`,
      );
      if (n.other_version)
        line(
          "",
          `${n.other_version.kind.replace("_", " ")}: ${n.other_version.total} → ${n.other_version.number.value}`,
        );
    }
    for (const s of b.spelling_ideas)
      line(`Idea for ${s.for}`, `${s.name} ${sign(s.total)} (${s.edits.join(", ")})`);
    line(
      "Domains",
      b.domains.map((d) => `${d.domain} ${d.with_extension.chain.join(" → ")}`).join("; "),
    );
    const k = b.brand_kit;
    line(
      "Brand kit",
      `${k.planet}: ${k.day}, ${k.colours.join("/")}; lucky ${k.lucky_numbers.join(", ")}; launch days ${k.launch_days.join(", ")}`,
    );
  }
  if (modules.compatibility) {
    const c = modules.compatibility;
    head(`Compatibility: ${c.a} and ${c.b} (${c.relationship.replace("_", " ")})`);
    line("Score", `${c.score}/100, ${c.band.replace("_", " ")}`);
    for (const x of c.components)
      line(x.id.replace(/_/g, " "), `${x.points}/${x.weight}  [${x.detail}]`);
    line("Shared Lo Shu gaps", c.combined_loshu.shared_gaps.join(", ") || "none");
    line(
      "Good joint years",
      c.timeline
        .filter((t) => t.joint_step)
        .map((t) => t.year)
        .join(", ") || "none",
    );
  }
  if (modules.dates) {
    const d = modules.dates;
    head(`Best dates for a ${d.purpose}, ${d.from} to ${d.to}`);
    for (const x of d.dates)
      line(
        `${x.date} ${x.weekday.slice(0, 3)}`,
        `score ${x.score}; ${x.people.map((pp) => `${pp.name}: personal day ${pp.personal_day}`).join("; ")}`,
      );
  }

  console.log(`\nInput hash ${p.meta.input_hash}`);
} catch (e) {
  if (e instanceof EngineError) {
    console.error(`Error ${e.code}${e.field ? ` (${e.field})` : ""}: ${e.message}`);
    process.exit(1);
  }
  throw e;
}
