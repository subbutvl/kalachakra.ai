"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { formatValue, type NumberResult, type ProfileResult } from "@kalachakra/engine";
import { BirthChart, KuaCompass, LoshuGrid, Timeline } from "@kalachakra/report/visuals";
import { Button, Card, Select } from "@kalachakra/ui";
import { NumberTile, signed, Tabs, Trace } from "@/components/practitioner/common";
import { diffResults, PROFILE_OPTIONS, profileFor, rulesFor } from "@/lib/engine";
import { longDate } from "@/lib/validate";
import { usePractitioner } from "@/stores/practitioner";

type Tab = "overview" | "vedic" | "chaldean" | "pythagorean" | "loshu" | "timing" | "trace";
const TABS: [Tab, string][] = [
  ["overview", "Overview"],
  ["vedic", "Vedic"],
  ["chaldean", "Chaldean name"],
  ["pythagorean", "Pythagorean"],
  ["loshu", "Lo Shu and Kua"],
  ["timing", "Timing"],
  ["trace", "Trace"],
];

const v = (r: NumberResult) => formatValue(r);

/** The working view for one client (phase 1 spec 6.1), computed in the page. */
export default function WorkingView() {
  const { id } = useParams<{ id: string }>();
  const { clients, profile, setProfile } = usePractitioner();
  const client = clients.find((c) => c.id === id);
  const [tab, setTab] = useState<Tab>("overview");
  const rules = useMemo(() => rulesFor(profile), [profile]);
  const result = useMemo(() => (client ? profileFor(client.person, rules) : undefined), [client, rules]);

  // When the rule profile changes, remember the numbers from before so changes can be highlighted.
  const prev = useRef<ProfileResult | undefined>(undefined);
  const [before, setBefore] = useState<ProfileResult>();
  useEffect(() => {
    if (prev.current && result && prev.current.meta.profile + JSON.stringify(prev.current.meta.input_hash) !== result.meta.profile + JSON.stringify(result.meta.input_hash)) {
      setBefore(prev.current);
    }
    prev.current = result;
  }, [result]);
  const changes = useMemo(() => new Map((before && result ? diffResults(before, result) : []).map((c) => [c.path, c.a])), [before, result]);
  const was = (path: string) => {
    const old = changes.get(path);
    return old === undefined ? undefined : String(old);
  };

  if (!client || !result) {
    return (
      <p>
        Client not found. <Link href="/practitioner">Back to clients</Link>
      </p>
    );
  }
  const P = result;
  const dn = P.date_numbers;
  const ch = P.chaldean.headline;
  const py = P.pythagorean;
  const t = P.timing;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl">{client.person.name}</h1>
          <p className="text-muted">
            {longDate(client.person.dob)} · age {t.age}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            aria-label="Rule profile"
            className="h-9 w-auto text-sm"
            value={profile.kind === "custom" ? "custom" : profile.id}
            onChange={(e) => e.target.value !== "custom" && setProfile({ kind: "id", id: e.target.value })}
          >
            {PROFILE_OPTIONS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
            {profile.kind === "custom" ? <option value="custom">Custom</option> : null}
          </Select>
          <Button asChild variant="gold" size="sm">
            <Link href={`/practitioner/client/${client.id}/report`}>Report editor</Link>
          </Button>
        </div>
      </div>
      {changes.size ? (
        <p role="status" className="rounded-xl bg-sand-50 p-3 text-sm" data-testid="changes-banner">
          The rule profile changed: {changes.size} result{changes.size === 1 ? "" : "s"} changed. Changed numbers are outlined in gold with their old value.{" "}
          <button type="button" className="underline" onClick={() => setBefore(undefined)}>
            Clear
          </button>
        </p>
      ) : null}

      <Tabs tabs={TABS} value={tab} onChange={setTab} label="Working view" />

      {tab === "overview" ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <NumberTile label="Mulank" value={v(dn.mulank)} detail={dn.mulank.planet} changed={was("date_numbers.mulank.value")} />
          <NumberTile label="Bhagyank" value={v(dn.bhagyank)} detail={dn.bhagyank.planet} changed={was("date_numbers.bhagyank.value")} />
          <NumberTile label="Name number" value={v(ch.name_number.number)} detail={`compound ${ch.name_number.compound?.value ?? "–"}`} changed={was("chaldean.headline.name_number.number.value")} />
          <NumberTile label="Driver–conductor" value={signed(P.driver_conductor.pair.score)} detail={P.driver_conductor.pair.label} />
          <NumberTile label="Life path" value={v(py.life_path)} changed={was("pythagorean.life_path.value")} />
          <NumberTile label="Expression" value={v(py.expression)} changed={was("pythagorean.expression.value")} />
          <NumberTile label="Soul urge" value={v(py.soul_urge)} changed={was("pythagorean.soul_urge.value")} />
          <NumberTile label="Personality" value={v(py.personality)} changed={was("pythagorean.personality.value")} />
          <NumberTile label="Maturity" value={v(py.maturity)} detail={py.maturity.system} changed={was("pythagorean.maturity.value")} />
          <NumberTile label="Kua" value={P.kua?.value ?? "–"} detail={P.kua?.group} changed={was("kua.value")} />
          <NumberTile label={`Personal year ${t.personal_year.year}`} value={v(t.personal_year)} changed={was("timing.personal_year.value")} />
          <NumberTile label="Lo Shu missing" value={P.loshu.missing.join(" ") || "none"} changed={was("loshu.missing")} />
          <NumberTile label="Lucky numbers" value={P.lucky.numbers.join(" ")} />
          <NumberTile label="Fit of name" value={signed(ch.fit.total)} detail={ch.fit.label} changed={was("chaldean.headline.fit.total")} />
          {P.flags.length ? (
            <Card className="col-span-2 sm:col-span-4">
              <div className="font-label text-xs uppercase text-muted">Flags</div>
              <p className="mt-1 text-sm">{P.flags.map((f) => `${f.flag.replace(/_/g, " ")} (${f.where}${f.value !== undefined ? ` ${f.value}` : ""})`).join(" · ")}</p>
            </Card>
          ) : null}
          {client.notes ? (
            <Card className="col-span-2 sm:col-span-4">
              <div className="font-label text-xs uppercase text-muted">Notes</div>
              <p className="mt-1 whitespace-pre-wrap text-sm">{client.notes}</p>
            </Card>
          ) : null}
        </div>
      ) : null}

      {tab === "vedic" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <NumberTile label="Mulank" value={v(dn.mulank)} detail={dn.mulank.planet} changed={was("date_numbers.mulank.value")} />
            <Trace lines={dn.mulank.trace} />
          </Card>
          <Card>
            <NumberTile label="Bhagyank" value={v(dn.bhagyank)} detail={dn.bhagyank.planet} changed={was("date_numbers.bhagyank.value")} />
            <Trace lines={dn.bhagyank.trace} />
          </Card>
          <Card>
            <h3 className="text-base">Driver and conductor</h3>
            <p className="mt-2 text-sm">
              {dn.mulank.reduced}–{dn.bhagyank.reduced}: {signed(P.driver_conductor.pair.score)} ({P.driver_conductor.pair.label})
              {P.driver_conductor.special ? `, special pair ${P.driver_conductor.special}` : ""}
            </p>
            <Trace lines={P.driver_conductor.pair.trace} />
          </Card>
          <Card>
            <h3 className="text-base">Lucky set</h3>
            <p className="mt-2 text-sm">
              Numbers {P.lucky.numbers.join(", ")} · days {P.lucky.days.join(", ")} · colours {P.lucky.colours.join(", ")}
            </p>
            <Trace lines={P.lucky.trace} />
          </Card>
        </div>
      ) : null}

      {tab === "chaldean" ? (
        <div className="space-y-4">
          {[ch, ...P.chaldean.others].map((n) => (
            <Card key={n.kind}>
              <h3 className="text-base">
                {n.normalised} <span className="font-label text-xs text-muted">({n.kind.replace("_", " ")})</span>
              </h3>
              <div className="mt-3 overflow-x-auto">
                <table className="text-sm">
                  <tbody>
                    {n.name_number.letters.map((part) => (
                      <tr key={part.part}>
                        {part.letters.map((l, i) => (
                          <td key={i} className="border border-sand px-2 py-1 text-center">
                            <div className="font-heading">{l.letter}</div>
                            <div className="font-label text-xs text-gold-600">{l.value}</div>
                          </td>
                        ))}
                        <td className="px-3 font-label text-sm">= {part.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-sm">
                Total {n.name_number.total} → {v(n.name_number.number)} ({n.name_number.number.planet})
                {n.name_number.compound ? ` · compound ${n.name_number.compound.value} ${n.name_number.compound.name}${n.name_number.compound.class ? `, ${n.name_number.compound.class}` : ""}` : ""}
              </p>
              <p className="text-sm">
                First name {v(n.parts.first.number)}
                {n.parts.surname ? ` · surname ${v(n.parts.surname.number)}` : ""}
                {n.parts.initials ? ` · ${n.parts.initials.form} ${v(n.parts.initials.number)}` : ""} · fit with Mulank {signed(n.fit.mulank)}, Bhagyank {signed(n.fit.bhagyank)} = {signed(n.fit.total)} ({n.fit.label})
              </p>
            </Card>
          ))}
        </div>
      ) : null}

      {tab === "pythagorean" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="grid grid-cols-2 gap-3">
            <NumberTile label="Life path" value={v(py.life_path)} changed={was("pythagorean.life_path.value")} />
            <NumberTile label="Expression" value={v(py.expression)} changed={was("pythagorean.expression.value")} />
            <NumberTile label="Soul urge" value={v(py.soul_urge)} changed={was("pythagorean.soul_urge.value")} />
            <NumberTile label="Personality" value={v(py.personality)} changed={was("pythagorean.personality.value")} />
            <NumberTile label="Balance" value={v(py.balance)} />
            <NumberTile label="Rational thought" value={v(py.rational_thought)} />
          </Card>
          <Card>
            <h3 className="text-base">Inner layers</h3>
            <ul className="mt-2 space-y-1 text-sm">
              <li>Hidden passion: {py.hidden_passion.values.join(", ")}</li>
              <li>Karmic lessons: {py.karmic_lessons.values.join(", ") || "none"}</li>
              <li>Subconscious self: {py.subconscious_self.value}</li>
              <li>
                Cornerstone {py.cornerstone.letter}, capstone {py.capstone.letter}
                {py.first_vowel ? `, first vowel ${py.first_vowel.letter}` : ""}
              </li>
              <li>Planes: {Object.entries(py.planes_of_expression).map(([k, x]) => `${k} ${x.count}`).join(", ")}</li>
            </ul>
            <div className="mx-auto mt-4 max-w-56">
              <BirthChart cells={py.birth_chart.cells} arrows={py.birth_chart.arrows} />
            </div>
          </Card>
        </div>
      ) : null}

      {tab === "loshu" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <div className="mx-auto max-w-64">
              <LoshuGrid layout={P.loshu.layout} cells={P.loshu.cells} />
            </div>
            <p className="mt-2 text-sm">
              Missing {P.loshu.missing.join(", ") || "none"} · repeated {P.loshu.repeated.join(", ") || "none"}
            </p>
            <ul className="mt-2 grid grid-cols-2 gap-1 text-xs">
              {Object.entries(P.loshu.planes).map(([k, p]) => (
                <li key={k}>
                  {k}: <span className="text-gold-600">{p.state}</span>
                </li>
              ))}
            </ul>
            <Trace lines={P.loshu.trace} />
          </Card>
          <Card>
            {P.kua ? (
              <>
                <p className="text-sm">
                  Kua {P.kua.value} ({P.kua.group} group, solar year {P.kua.solar_year})
                </p>
                <div className="mx-auto max-w-64">
                  <KuaCompass directions={P.kua.directions} good={P.kua.good} />
                </div>
                <Trace lines={P.kua.trace} />
              </>
            ) : (
              <p className="text-sm text-muted">No Kua: the client has no Kua basis.</p>
            )}
          </Card>
        </div>
      ) : null}

      {tab === "timing" ? (
        <div className="space-y-4">
          <Card className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <NumberTile label={`Personal year ${t.personal_year.year}`} value={v(t.personal_year)} changed={was("timing.personal_year.value")} />
            <NumberTile label="Universal year" value={v(t.universal.year)} />
            <NumberTile label="Essence" value={v(t.essence)} />
            <NumberTile label="Dasha" value={t.dasha.current?.number ?? "–"} detail={t.dasha.current ? `ages ${t.dasha.current.from_age}–${t.dasha.current.to_age}` : undefined} />
          </Card>
          <Card>
            <h3 className="text-base">Next 12 months</h3>
            <div className="mt-2 flex flex-wrap gap-2 text-sm">
              {t.months_ahead.map((m) => (
                <span key={`${m.year}-${m.month}`} className="rounded-lg border border-sand px-2 py-1">
                  {m.month}/{m.year}: <b>{v(m.personal_month)}</b>
                </span>
              ))}
            </div>
            <h3 className="mt-4 text-base">Pinnacles, challenges, dasha</h3>
            <Timeline pinnacles={t.pinnacles.map((s) => ({ value: v(s.number), from: s.from_age, ...(s.to_age !== undefined ? { to: s.to_age } : {}) }))} dasha={t.dasha.periods.filter((d) => d.from_age < 90)} age={t.age} />
            <p className="text-sm">Challenges: {t.challenges.map((c) => c.number.value).join(", ")}</p>
            <h3 className="mt-4 text-base">10-year strip</h3>
            <p className="text-sm">{t.next_10_years.map((y) => `${y.year}: ${v(y.personal_year)}`).join(" · ")}</p>
          </Card>
        </div>
      ) : null}

      {tab === "trace" ? (
        <Card className="space-y-4 text-sm">
          {(
            [
              ["Mulank", dn.mulank.trace],
              ["Bhagyank", dn.bhagyank.trace],
              ["Name number", ch.name_number.number.trace],
              ["Life path", py.life_path.trace],
              ["Expression", py.expression.trace],
              ["Maturity", py.maturity.trace],
              ["Lo Shu", P.loshu.trace],
              ["Kua", P.kua?.trace],
              ["Personal year", t.personal_year.trace],
              ["Pinnacles", t.pinnacles[0]?.number.trace],
            ] as [string, string[] | undefined][]
          ).map(([label, lines]) => (
            <div key={label}>
              <div className="font-label text-xs uppercase text-muted">{label}</div>
              <Trace lines={lines} />
            </div>
          ))}
          <div>
            <div className="font-label text-xs uppercase text-muted">Rule settings behind these numbers</div>
            <p className="mt-1 font-mono text-xs">
              Profile {P.meta.profile} · rules {P.meta.rules} · engine {P.meta.engine} · {P.meta.input_hash.slice(0, 20)}…
            </p>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
