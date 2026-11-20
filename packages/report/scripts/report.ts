// Produces a report PDF from the command line, without the web app (phase 1 spec 11).
//
//   pnpm report --name "Aarav Mehra" --dob 1991-08-14 --gender male
//   pnpm report --name "Myra Kapoor" --dob 2016-03-09 --gender female --audience child --language ta
//   pnpm report --sample <id> --mobile 9876524310   (people from test/local/people.local.json)
//
// Options: --birth-name, --as-of, --profile, --audience adult|child, --language en|ta,
// --mobile (repeatable), --vehicle (repeatable), --html (also write the HTML), --out <folder>.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { ruleProfiles, rulesVersions } from "@kalachakra/rules";
import {
  computeMobile,
  computeProfile,
  computeVehicle,
  EngineError,
  resolveRules,
  type PersonInput,
} from "@kalachakra/engine";
import { buildReport, library, renderReportHtml } from "../src/index.js";
import { closePdfBrowser, renderReportPdf } from "../src/pdf.js";
import { embeddedFontCss } from "../src/fonts.js";

const { values } = parseArgs({
  options: {
    name: { type: "string" },
    "birth-name": { type: "string" },
    dob: { type: "string" },
    gender: { type: "string", default: "unspecified" },
    "as-of": { type: "string" },
    profile: { type: "string", default: "house-default" },
    audience: { type: "string", default: "adult" },
    language: { type: "string", default: "en" },
    mobile: { type: "string", multiple: true },
    vehicle: { type: "string", multiple: true },
    sample: { type: "string" },
    html: { type: "boolean", default: false },
    out: { type: "string", default: "reports" },
    help: { type: "boolean", default: false },
  },
});

let person: PersonInput | undefined;
if (values.sample) {
  const dir = resolve(import.meta.dirname, "../../engine/test/local");
  const local = join(dir, "people.local.json");
  const file = existsSync(local) ? local : join(dir, "people.local.example.json");
  const people = (
    JSON.parse(readFileSync(file, "utf8")) as {
      people: { id: string; person: PersonInput; mobiles?: string[] }[];
    }
  ).people;
  const s = people.find((x) => x.id === values.sample);
  if (!s) {
    console.error(`No sample "${values.sample}" (have: ${people.map((x) => x.id).join(", ")}).`);
    process.exit(1);
  }
  person = s.person;
  if (!values.mobile?.length && s.mobiles?.length) values.mobile = s.mobiles;
} else if (values.name && values.dob) {
  person = {
    name: values.name,
    other_names: values["birth-name"]
      ? [{ kind: "birth_certificate", name: values["birth-name"] }]
      : [],
    dob: values.dob,
    gender: values.gender as PersonInput["gender"],
  };
}
if (values.help || !person) {
  console.log(
    'Usage: pnpm report --name "Aarav Mehra" --dob 1991-08-14 --gender male [--audience child] [--language ta] [--mobile 98765...] [--html]\n   or: pnpm report --sample <id>',
  );
  process.exit(values.help ? 0 : 1);
}

const now = new Date();
const asOf =
  values["as-of"] ??
  `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

try {
  const rules = resolveRules({ versions: rulesVersions, profiles: ruleProfiles }, values.profile);
  const profile = computeProfile({ person, as_of: asOf }, rules);
  const doc = buildReport({
    profile,
    library: library(values.language as "en" | "ta"),
    audience: values.audience as "adult" | "child",
    modules: {
      ...(values.mobile?.length
        ? { mobile: computeMobile({ numbers: values.mobile }, profile, rules) }
        : {}),
      ...(values.vehicle?.length
        ? { vehicle: computeVehicle(values.vehicle, profile, rules) }
        : {}),
    },
  });
  mkdirSync(values.out, { recursive: true });
  const t0 = performance.now();
  const pdf = await renderReportPdf(doc);
  const name = values.language === "ta" ? doc.file_name.replace(".pdf", "_ta.pdf") : doc.file_name;
  const path = join(values.out, name);
  writeFileSync(path, pdf);
  console.log(
    `Wrote ${path} (${Math.round(pdf.length / 1024)} KB, ${doc.sections.length} sections, ${Math.round(performance.now() - t0)} ms)`,
  );
  if (values.html) {
    const htmlPath = path.replace(/\.pdf$/, ".html");
    writeFileSync(htmlPath, renderReportHtml(doc, { fontCss: embeddedFontCss() }));
    console.log(`Wrote ${htmlPath}`);
  }
} catch (e) {
  if (e instanceof EngineError) {
    console.error(`Error ${e.code}${e.field ? ` (${e.field})` : ""}: ${e.message}`);
    process.exitCode = 1;
  } else throw e;
} finally {
  await closePdfBrowser();
}
