// Makes the five reports for the M8 manual review (phase 1 spec, M8) through
// the running API, and prints how long each took. The people are fictional.
//
//   pnpm dev            (in another terminal, or the API alone)
//   node scripts/review-reports.mjs [out-folder]
//
// Each case covers something a reviewer should look at closely.
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const API = process.env.KALACHAKRA_API ?? "http://127.0.0.1:8787";
const OUT = resolve(process.argv[2] ?? "review");
const AS_OF = "2026-11-20";

export const CASES = [
  {
    id: "1-aarav-en",
    why: "The benchmark person. Every number should match the worked examples in the rules spec. Mobile add-on.",
    body: {
      person: { name: "Aarav Mehra", dob: "1991-08-14", gender: "male" },
      language: "en",
      modules: { mobile: { numbers: ["9876524310"], goals: ["career"] } },
    },
  },
  {
    id: "2-myra-child-ta",
    why: "Child edition in Tamil: learning style instead of career, spelling choices for school records, Tamil typesetting.",
    body: {
      person: { name: "Myra Kapoor", dob: "2016-03-09", gender: "female" },
      audience: "child",
      language: "ta",
    },
  },
  {
    id: "3-meenakshi-lichun-ta",
    why: "Born a day before the solar new year (Lichun), so the Kua year is uncertain without a birth time. Compatibility with a partner, in Tamil.",
    body: {
      person: { name: "Meenakshi Sundaram", dob: "1985-02-03", gender: "female" },
      language: "ta",
      modules: {
        compatibility: {
          partner: { name: "Senthil Kumar", dob: "1982-07-19", gender: "male" },
          relationship: "couple",
        },
      },
    },
  },
  {
    id: "4-karthik-business-en",
    why: "Five 9s in the date, so the Lo Shu grid has a heavily repeated number. Business names with a partner, a vehicle and a house.",
    body: {
      person: { name: "Karthik Raman", dob: "1999-09-29", gender: "male" },
      language: "en",
      modules: {
        business: {
          names: ["Raman Design Studio", "Karthik Interiors", "Nine Lines"],
          trade: "hospitality_design",
          partners: [{ name: "Anitha Raman", dob: "1997-04-11", gender: "female" }],
        },
        vehicle: { registrations: ["TN 09 BX 4521"] },
        house: { flat: "7A", building: "22", door: "SW" },
      },
    },
  },
  {
    id: "5-priya-kua-basis-en",
    why: "Gender not given, Kua from the female formula by choice. Several names (birth certificate, nickname). Practitioner rule profile.",
    body: {
      person: {
        name: "Priya Nair",
        other_names: [
          { kind: "birth_certificate", name: "Priyadarshini Nair" },
          { kind: "nickname", name: "Pri" },
        ],
        dob: "1977-11-29",
        gender: "unspecified",
        kua_basis: "female",
      },
      language: "en",
      rule_profile: "sample-practitioner",
    },
  },
];

async function post(path, body) {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ as_of: AS_OF, ...body }),
  });
  if (!res.ok) throw new Error(`${path}: ${res.status} ${await res.text()}`);
  return res;
}

mkdirSync(OUT, { recursive: true });
const rows = [];
for (const c of CASES) {
  let t = performance.now();
  const doc = await (await post("/v1/report", c.body)).json();
  const reportMs = Math.round(performance.now() - t);
  t = performance.now();
  const pdf = Buffer.from(await (await post("/v1/report/pdf", c.body)).arrayBuffer());
  const pdfMs = Math.round(performance.now() - t);
  const pages = (pdf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) ?? []).length;
  const file = `${c.id}.pdf`;
  writeFileSync(join(OUT, file), pdf);
  rows.push({ file, sections: doc.sections.length, pages, reportMs, pdfMs });
  console.log(
    `${file}: ${doc.sections.length} sections, ${pages} pages, report ${reportMs} ms, PDF ${pdfMs} ms`,
  );
}
writeFileSync(join(OUT, "timings.json"), JSON.stringify(rows, null, 2));
