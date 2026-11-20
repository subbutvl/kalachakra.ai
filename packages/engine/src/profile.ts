import type { ResolvedRules } from "./rules/loader.js";
import { ProfileRequestSchema, type ProfileRequestInput } from "./schemas/person.js";
import { ProfileResultSchema, type ProfileResult } from "./schemas/profile.js";
import { EngineError } from "./errors.js";
import { ENGINE_VERSION } from "./version.js";
import { formatDate, parseDate } from "./core/dates.js";
import { normaliseName } from "./core/letters.js";
import { inputHash } from "./core/hash.js";
import { formatIssues } from "./rules/validate.js";
import { birthMoment } from "./modules/birth.js";
import { dateNumbers } from "./modules/dateNumbers.js";
import { chaldeanName, type ChaldeanName } from "./modules/chaldean.js";
import { pythagorean } from "./modules/pythagorean.js";
import { kua } from "./modules/kua.js";
import { loshu } from "./modules/loshu.js";
import { driverConductor } from "./modules/driverConductor.js";
import { lucky } from "./modules/lucky.js";
import { timing } from "./modules/timing.js";

/**
 * Every person-level number (phase 1 spec 4.1): date numbers, Chaldean,
 * Pythagorean, Lo Shu, Kua, driver–conductor, lucky set and timing. Pure and
 * synchronous: the same request and rules always give the same result.
 * The name optimiser joins in milestone 3.
 */
export function computeProfile(request: ProfileRequestInput, rules: ResolvedRules): ProfileResult {
  const parsed = ProfileRequestSchema.safeParse(request);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    throw new EngineError(
      "invalid_input",
      formatIssues("request", parsed.error.issues),
      first ? first.path.join(".") : undefined,
    );
  }
  const { person, as_of } = parsed.data;
  const asOf = parseDate(as_of, "as_of");
  const birth = birthMoment(person, rules);
  const date = birth.date;

  const dn = dateNumbers(date, rules);
  const mulank = dn.mulank.reduced;
  const bhagyank = dn.bhagyank.reduced;

  // D1: which names are analysed. The name in daily use is the headline unless only the birth name is wanted.
  const birthCert = person.other_names.find((n) => n.kind === "birth_certificate")?.name;
  const analysed = rules.settings["names.analysed"];
  const names: ChaldeanName[] = [];
  if (analysed === "birth_certificate" && birthCert) {
    names.push(chaldeanName(rules, "birth_certificate", birthCert, mulank, bhagyank));
  } else {
    names.push(chaldeanName(rules, "daily_use", person.name, mulank, bhagyank));
    if (analysed === "both" && birthCert) {
      names.push(chaldeanName(rules, "birth_certificate", birthCert, mulank, bhagyank));
    }
  }
  const headline = names[0]!;
  const birthName = birthCert ?? person.name;

  const py = pythagorean(rules, birthName, date, headline.name_number.number.reduced);
  const k = kua(rules, person, birth);
  const grid = loshu(rules, date, mulank, bhagyank, k?.value ?? null);
  const dc = driverConductor(rules, mulank, bhagyank);
  const lk = lucky(rules, mulank, bhagyank);
  const tm = timing(rules, date, birthName, mulank, py.life_path.reduced, asOf, as_of);

  const flags: ProfileResult["flags"] = [];
  for (const n of dn.karmic_debt) flags.push({ flag: "karmic_debt", where: "date_numbers", value: n });
  for (const [where, r] of [
    ["bhagyank", dn.bhagyank],
    ["mulank", dn.mulank],
    ["life_path", py.life_path],
    ["expression", py.expression],
    ["soul_urge", py.soul_urge],
    ["personality", py.personality],
    ["personal_year", tm.personal_year],
  ] as const) {
    if (r.master !== undefined) flags.push({ flag: "master", where, value: r.master });
  }
  for (const [where, r] of [["expression", py.expression], ["soul_urge", py.soul_urge]] as const) {
    if (r.flags?.includes("karmic_debt")) flags.push({ flag: "karmic_debt", where, value: r.chain.find((n) => [13, 14, 16, 19].includes(n)) });
  }
  for (const n of names) {
    if (n.name_number.number.flags?.includes("unfavourable_compound")) {
      flags.push({ flag: "unfavourable_compound", where: `chaldean.${n.kind}`, value: n.name_number.compound?.value });
    }
  }

  const result: ProfileResult = {
    meta: {
      engine: ENGINE_VERSION,
      rules: rules.rulesVersion,
      profile: rules.profile.id,
      as_of,
      input_hash: inputHash({ request: parsed.data, rules: rules.rulesVersion, profile: rules.profile.id, settings: rules.settings }),
    },
    person: {
      name: person.name,
      normalised: normaliseName(person.name).text,
      dob: person.dob,
      working_date: formatDate(date),
      gender: person.gender,
      ...(person.kua_basis ? { kua_basis: person.kua_basis } : {}),
      notes: [...birth.notes, ...(k?.uncertain ? [k.uncertain] : [])],
    },
    date_numbers: dn,
    chaldean: { headline, others: names.slice(1) },
    pythagorean: py,
    loshu: grid,
    kua: k,
    driver_conductor: dc,
    lucky: lk,
    timing: tm,
    flags,
  };

  const check = ProfileResultSchema.safeParse(result);
  if (!check.success) {
    throw new EngineError("invalid_output", formatIssues("profile", check.error.issues));
  }
  return result;
}
