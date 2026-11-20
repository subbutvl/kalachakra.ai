"use client";

import { useT } from "@/i18n/locale";
import { PLANET_NAMES, type Planet } from "@/lib/texts";
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
const TABS = /* i18n */ [
  ["overview", "Overview"],
  ["vedic", "Vedic"],
  ["chaldean", "Chaldean name"],
  ["pythagorean", "Pythagorean"],
  ["loshu", "Lo Shu and Kua"],
  ["timing", "Timing"],
  ["trace", "Trace"],
] as const satisfies readonly (readonly [Tab, string])[];

const v = (r: NumberResult) => formatValue(r);

/** The working view for one client (phase 1 spec 6.1), computed in the page. */
export default function WorkingView() {
  const { t, locale } = useT();
  const planet = (p?: string) => (p && p in PLANET_NAMES ? PLANET_NAMES[p as Planet][locale] : (p ?? ""));
  const { id } = useParams<{ id: string }>();
  const { clients, profile, setProfile } = usePractitioner();
  const client = clients.find((c) => c.id === id);
  const [tab, setTab] = useState<Tab>("overview");
  const rules = useMemo(() => rulesFor(profile), [profile]);
  const result = useMemo(
    () => (client ? profileFor(client.person, rules) : undefined),
    [client, rules],
  );

  // When the rule profile changes, remember the numbers from before so changes can be highlighted.
  const prev = useRef<ProfileResult | undefined>(undefined);
  const [before, setBefore] = useState<ProfileResult>();
  useEffect(() => {
    if (
      prev.current &&
      result &&
      prev.current.meta.profile + JSON.stringify(prev.current.meta.input_hash) !==
        result.meta.profile + JSON.stringify(result.meta.input_hash)
    ) {
      setBefore(prev.current);
    }
    prev.current = result;
  }, [result]);
  const changes = useMemo(
    () => new Map((before && result ? diffResults(before, result) : []).map((c) => [c.path, c.a])),
    [before, result],
  );
  const was = (path: string) => {
    const old = changes.get(path);
    return old === undefined ? undefined : String(old);
  };

  if (!client || !result) {
    return (
      <p>
        {t("Client not found.")} <Link href="/practitioner">{t("Back to clients")}</Link>
      </p>
    );
  }
  const P = result;
  const dn = P.date_numbers;
  const ch = P.chaldean.headline;
  const py = P.pythagorean;
  const tm = P.timing;

  return (
    <div className="space-y-6">
      <div className="rounded-card bg-ink p-5 text-sand sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl text-white sm:text-3xl">{client.person.name}</h1>
            <p className="mt-1 text-sand/80">
              {t("{date}, age {age}", { date: longDate(client.person.dob, locale), age: tm.age })}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              aria-label={t("Rule profile")}
              className="h-9 w-auto border-ink-500 bg-ink-700 text-sm text-white"
              value={profile.kind === "custom" ? "custom" : profile.id}
              onChange={(e) => e.target.value !== "custom" && setProfile({ kind: "id", id: e.target.value })}
            >
              {PROFILE_OPTIONS.map((p) => (
                <option key={p.id} value={p.id}>
                  {t(p.label)}
                </option>
              ))}
              {profile.kind === "custom" ? <option value="custom">{t("Custom")}</option> : null}
            </Select>
            <Button asChild variant="gold" size="sm">
              <Link href={`/practitioner/client/${client.id}/report`}>{t("Report editor")}</Link>
            </Button>
          </div>
        </div>
        <dl className="mt-6 grid grid-cols-3 gap-y-4 border-t border-ink-700 pt-5 sm:grid-cols-6">
          {(
            [
              [t("Mulank"), v(dn.mulank), planet(dn.mulank.planet)],
              [t("Bhagyank"), v(dn.bhagyank), planet(dn.bhagyank.planet)],
              [t("Name number"), v(ch.name_number.number), planet(ch.name_number.number.planet)],
              [t("Life path"), v(py.life_path), ""],
              [t("Kua"), P.kua?.value ?? "–", ""],
              [t("Personal year"), v(tm.personal_year), String(tm.personal_year.year)],
            ] as [string, string | number, string][]
          ).map(([k, val, sub], i) => (
            <div key={k} className={i ? "sm:border-l sm:border-ink-700 sm:pl-4" : ""}>
              <dt className="font-label text-xs text-sand/60">{k}</dt>
              <dd className="font-heading text-3xl text-gold">{val}</dd>
              {sub ? <dd className="font-label text-xs text-sand/80">{sub}</dd> : null}
            </div>
          ))}
        </dl>
      </div>
      {changes.size ? (
        <p role="status" className="rounded-xl bg-sand-50 p-3 text-sm" data-testid="changes-banner">
          {t("The rule profile changed: {n} results changed. Changed numbers are outlined in gold with their old value.", { n: changes.size })}{" "}
          <button type="button" className="underline" onClick={() => setBefore(undefined)}>
            {t("Clear")}
          </button>
        </p>
      ) : null}

      <Tabs tabs={TABS} value={tab} onChange={setTab} label={t("Working view")} />

      {tab === "overview" ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <NumberTile
            label={t("Mulank")}
            value={v(dn.mulank)}
            detail={planet(dn.mulank.planet)}
            changed={was("date_numbers.mulank.value")}
          />
          <NumberTile
            label={t("Bhagyank")}
            value={v(dn.bhagyank)}
            detail={planet(dn.bhagyank.planet)}
            changed={was("date_numbers.bhagyank.value")}
          />
          <NumberTile
            label={t("Name number")}
            value={v(ch.name_number.number)}
            detail={t("compound {c}", { c: ch.name_number.compound?.value ?? "–" })}
            changed={was("chaldean.headline.name_number.number.value")}
          />
          <NumberTile
            label={t("Driver–conductor")}
            value={signed(P.driver_conductor.pair.score)}
            detail={P.driver_conductor.pair.label}
          />
          <NumberTile
            label={t("Life path")}
            value={v(py.life_path)}
            changed={was("pythagorean.life_path.value")}
          />
          <NumberTile
            label={t("Expression")}
            value={v(py.expression)}
            changed={was("pythagorean.expression.value")}
          />
          <NumberTile
            label={t("Soul urge")}
            value={v(py.soul_urge)}
            changed={was("pythagorean.soul_urge.value")}
          />
          <NumberTile
            label={t("Personality")}
            value={v(py.personality)}
            changed={was("pythagorean.personality.value")}
          />
          <NumberTile
            label={t("Maturity")}
            value={v(py.maturity)}
            detail={py.maturity.system}
            changed={was("pythagorean.maturity.value")}
          />
          <NumberTile
            label={t("Kua")}
            value={P.kua?.value ?? "–"}
            detail={P.kua?.group}
            changed={was("kua.value")}
          />
          <NumberTile
            label={t("Personal year {y}", { y: tm.personal_year.year })}
            value={v(tm.personal_year)}
            changed={was("timing.personal_year.value")}
          />
          <NumberTile
            label={t("Lo Shu missing")}
            value={P.loshu.missing.join(" ") || t("none")}
            changed={was("loshu.missing")}
          />
          <NumberTile label={t("Lucky numbers")} value={P.lucky.numbers.join(" ")} />
          <NumberTile
            label={t("Fit of name")}
            value={signed(ch.fit.total)}
            detail={ch.fit.label}
            changed={was("chaldean.headline.fit.total")}
          />
          {P.flags.length ? (
            <Card className="col-span-2 sm:col-span-4">
              <div className="font-label text-sm text-muted">{t("Flags")}</div>
              <p className="mt-1 text-sm">
                {P.flags
                  .map(
                    (f) =>
                      `${f.flag.replace(/_/g, " ")} (${f.where}${f.value !== undefined ? ` ${f.value}` : ""})`,
                  )
                  .join(" · ")}
              </p>
            </Card>
          ) : null}
          {client.notes ? (
            <Card className="col-span-2 sm:col-span-4">
              <div className="font-label text-sm text-muted">{t("Notes")}</div>
              <p className="mt-1 whitespace-pre-wrap text-sm">{client.notes}</p>
            </Card>
          ) : null}
        </div>
      ) : null}

      {tab === "vedic" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <NumberTile
              label={t("Mulank")}
              value={v(dn.mulank)}
              detail={planet(dn.mulank.planet)}
              changed={was("date_numbers.mulank.value")}
            />
            <Trace lines={dn.mulank.trace} />
          </Card>
          <Card>
            <NumberTile
              label={t("Bhagyank")}
              value={v(dn.bhagyank)}
              detail={planet(dn.bhagyank.planet)}
              changed={was("date_numbers.bhagyank.value")}
            />
            <Trace lines={dn.bhagyank.trace} />
          </Card>
          <Card>
            <h3 className="text-base">{t("Driver and conductor")}</h3>
            <p className="mt-2 text-sm">
              {dn.mulank.reduced}–{dn.bhagyank.reduced}: {signed(P.driver_conductor.pair.score)} (
              {P.driver_conductor.pair.label})
              {P.driver_conductor.special ? `, special pair ${P.driver_conductor.special}` : ""}
            </p>
            <Trace lines={P.driver_conductor.pair.trace} />
          </Card>
          <Card>
            <h3 className="text-base">{t("Lucky set")}</h3>
            <p className="mt-2 text-sm">
              Numbers {P.lucky.numbers.join(", ")} · days {P.lucky.days.join(", ")} · colours{" "}
              {P.lucky.colours.join(", ")}
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
                {n.normalised}{" "}
                <span className="font-label text-xs text-muted">({n.kind.replace("_", " ")})</span>
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
                Total {n.name_number.total} → {v(n.name_number.number)} (
                {n.name_number.number.planet})
                {n.name_number.compound
                  ? ` · compound ${n.name_number.compound.value} ${n.name_number.compound.name}${n.name_number.compound.class ? `, ${n.name_number.compound.class}` : ""}`
                  : ""}
              </p>
              <p className="text-sm">
                First name {v(n.parts.first.number)}
                {n.parts.surname ? ` · surname ${v(n.parts.surname.number)}` : ""}
                {n.parts.initials
                  ? ` · ${n.parts.initials.form} ${v(n.parts.initials.number)}`
                  : ""}{" "}
                · fit with Mulank {signed(n.fit.mulank)}, Bhagyank {signed(n.fit.bhagyank)} ={" "}
                {signed(n.fit.total)} ({n.fit.label})
              </p>
            </Card>
          ))}
        </div>
      ) : null}

      {tab === "pythagorean" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="grid grid-cols-2 gap-3">
            <NumberTile
              label={t("Life path")}
              value={v(py.life_path)}
              changed={was("pythagorean.life_path.value")}
            />
            <NumberTile
              label={t("Expression")}
              value={v(py.expression)}
              changed={was("pythagorean.expression.value")}
            />
            <NumberTile
              label={t("Soul urge")}
              value={v(py.soul_urge)}
              changed={was("pythagorean.soul_urge.value")}
            />
            <NumberTile
              label={t("Personality")}
              value={v(py.personality)}
              changed={was("pythagorean.personality.value")}
            />
            <NumberTile label={t("Balance")} value={v(py.balance)} />
            <NumberTile label={t("Rational thought")} value={v(py.rational_thought)} />
          </Card>
          <Card>
            <h3 className="text-base">{t("Inner layers")}</h3>
            <ul className="mt-2 space-y-1 text-sm">
              <li>Hidden passion: {py.hidden_passion.values.join(", ")}</li>
              <li>Karmic lessons: {py.karmic_lessons.values.join(", ") || "none"}</li>
              <li>Subconscious self: {py.subconscious_self.value}</li>
              <li>
                Cornerstone {py.cornerstone.letter}, capstone {py.capstone.letter}
                {py.first_vowel ? `, first vowel ${py.first_vowel.letter}` : ""}
              </li>
              <li>
                Planes:{" "}
                {Object.entries(py.planes_of_expression)
                  .map(([k, x]) => `${k} ${x.count}`)
                  .join(", ")}
              </li>
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
              Missing {P.loshu.missing.join(", ") || "none"} · repeated{" "}
              {P.loshu.repeated.join(", ") || "none"}
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
              <p className="text-sm text-muted">{t("No Kua: the client has no Kua basis.")}</p>
            )}
          </Card>
        </div>
      ) : null}

      {tab === "timing" ? (
        <div className="space-y-4">
          <Card className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <NumberTile
              label={t("Personal year {y}", { y: tm.personal_year.year })}
              value={v(tm.personal_year)}
              changed={was("timing.personal_year.value")}
            />
            <NumberTile label={t("Universal year")} value={v(tm.universal.year)} />
            <NumberTile label={t("Essence")} value={v(tm.essence)} />
            <NumberTile
              label={t("Dasha")}
              value={tm.dasha.current?.number ?? "–"}
              detail={
                tm.dasha.current
                  ? `ages ${tm.dasha.current.from_age}–${tm.dasha.current.to_age}`
                  : undefined
              }
            />
          </Card>
          <Card>
            <h3 className="text-base">{t("Next 12 months")}</h3>
            <div className="mt-2 flex flex-wrap gap-2 text-sm">
              {tm.months_ahead.map((m) => (
                <span
                  key={`${m.year}-${m.month}`}
                  className="rounded-lg border border-sand px-2 py-1"
                >
                  {m.month}/{m.year}: <b>{v(m.personal_month)}</b>
                </span>
              ))}
            </div>
            <h3 className="mt-4 text-base">{t("Pinnacles, challenges, dasha")}</h3>
            <Timeline
              pinnacles={tm.pinnacles.map((s) => ({
                value: v(s.number),
                from: s.from_age,
                ...(s.to_age !== undefined ? { to: s.to_age } : {}),
              }))}
              dasha={tm.dasha.periods.filter((d) => d.from_age < 90)}
              age={tm.age}
            />
            <p className="text-sm">
              Challenges: {tm.challenges.map((c) => c.number.value).join(", ")}
            </p>
            <h3 className="mt-4 text-base">10-year strip</h3>
            <p className="text-sm">
              {tm.next_10_years.map((y) => `${y.year}: ${v(y.personal_year)}`).join(" · ")}
            </p>
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
              ["Personal year", tm.personal_year.trace],
              ["Pinnacles", tm.pinnacles[0]?.number.trace],
            ] as [string, string[] | undefined][]
          ).map(([label, lines]) => (
            <div key={label}>
              <div className="font-label text-sm text-muted">{label}</div>
              <Trace lines={lines} />
            </div>
          ))}
          <div>
            <div className="font-label text-sm text-muted">
              {t("Rule settings behind these numbers")}
            </div>
            <p className="mt-1 font-mono text-xs">
              Profile {P.meta.profile} · rules {P.meta.rules} · engine {P.meta.engine} ·{" "}
              {P.meta.input_hash.slice(0, 20)}…
            </p>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
