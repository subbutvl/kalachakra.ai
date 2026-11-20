"use client";

import { useT } from "@/i18n/locale";
import { useMemo, useState } from "react";
import {
  computeBusiness,
  computeCompatibility,
  computeHouse,
  computeMobile,
  computeVehicle,
  EngineError,
  findDates,
  formatValue,
  scoreSpelling,
  suggestNames,
  type ProfileResult,
} from "@kalachakra/engine";
import { CompatibilityBars, FlowStrip } from "@kalachakra/report/visuals";
import { Button, Card, Field, Input, Select } from "@kalachakra/ui";
import { signed, Tabs } from "@/components/practitioner/common";
import { profileFor, rulesFor, todayIso } from "@/lib/engine";
import { usePractitioner, type Client } from "@/stores/practitioner";

type Lab = "name" | "mobile" | "vehicle" | "business" | "compatibility" | "dates";
const LABS = /* i18n */ [
  ["name", "Name lab"],
  ["mobile", "Mobile lab"],
  ["vehicle", "Vehicle and house"],
  ["business", "Business lab"],
  ["compatibility", "Compatibility"],
  ["dates", "Date picker"],
] as const satisfies readonly (readonly [Lab, string])[];

/** Runs an engine call and turns its errors into a message instead of a crash. */
function attempt<T>(fn: () => T): { value?: T; error?: string } {
  try {
    return { value: fn() };
  } catch (e) {
    return { error: e instanceof EngineError || e instanceof Error ? e.message : String(e) };
  }
}

function ClientPicker({
  clients,
  value,
  onChange,
  label = "Client",
}: {
  clients: Client[];
  value: string;
  onChange: (id: string) => void;
  label?: string;
}) {
  const { t } = useT();
  return (
    <label className="font-label text-sm">
      {t(label)}
      <Select className="mt-1" value={value} onChange={(e) => onChange(e.target.value)}>
        {clients.map((c) => (
          <option key={c.id} value={c.id}>
            {c.person.name}
          </option>
        ))}
      </Select>
    </label>
  );
}

function Problem({ message }: { message?: string }) {
  return message ? (
    <p role="alert" className="text-sm text-danger">
      {message}
    </p>
  ) : null;
}

/** The practitioner's labs (phase 1 spec 6.1): every number updates as you type. */
export default function Labs() {
  const { t } = useT();
  const { clients, profile } = usePractitioner();
  const [lab, setLab] = useState<Lab>("name");
  const [clientId, setClientId] = useState(clients[0]?.id ?? "");
  const rules = useMemo(() => rulesFor(profile), [profile]);
  const client = clients.find((c) => c.id === clientId) ?? clients[0];
  const owner = useMemo<ProfileResult | undefined>(
    () => (client ? profileFor(client.person, rules, 0) : undefined),
    [client, rules],
  );

  if (!clients.length)
    return <p className="text-muted">{t("Add a client on the client desk to use the labs.")}</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl sm:text-4xl">{t("Labs")}</h1>
      <Tabs tabs={LABS} value={lab} onChange={setLab} label={t("Labs")} />
      {lab !== "compatibility" ? (
        <ClientPicker clients={clients} value={client?.id ?? ""} onChange={setClientId} />
      ) : null}
      {owner && lab === "name" ? (
        <NameLab owner={owner} rules={rules} initial={client!.person.name} />
      ) : null}
      {owner && lab === "mobile" ? (
        <MobileLab owner={owner} rules={rules} initial={client!.mobiles.join("\n")} />
      ) : null}
      {owner && lab === "vehicle" ? <VehicleLab owner={owner} rules={rules} /> : null}
      {owner && lab === "business" ? (
        <BusinessLab owner={owner} rules={rules} clients={clients} />
      ) : null}
      {lab === "compatibility" ? <CompatibilityLab clients={clients} rules={rules} /> : null}
      {owner && lab === "dates" ? <DateLab owner={owner} rules={rules} /> : null}
    </div>
  );
}

type Rules = ReturnType<typeof rulesFor>;

function NameLab({
  owner,
  rules,
  initial,
}: {
  owner: ProfileResult;
  rules: Rules;
  initial: string;
}) {
  const { t } = useT();
  const [name, setName] = useState(initial);
  const [pinned, setPinned] = useState<string[]>([]);
  const m = owner.date_numbers.mulank.reduced;
  const b = owner.date_numbers.bhagyank.reduced;
  const now = attempt(() => scoreSpelling(rules, name, [], m, b));
  const ideas = attempt(() => suggestNames(rules, name, m, b, 5));
  const pinnedScores = pinned
    .map((p) => attempt(() => scoreSpelling(rules, p, [], m, b)).value)
    .filter(Boolean);
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="space-y-3">
        <Field id="lab-name" label={t("Spelling")}>
          <Input id="lab-name" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Problem message={now.error} />
        {now.value ? (
          <div className="text-sm" data-testid="name-lab-result">
            <p>
              <span className="font-heading text-3xl">{now.value.name_number}</span> · compound{" "}
              {now.value.compound ?? "–"}
              {now.value.compound_class ? ` (${now.value.compound_class})` : ""} · score{" "}
              <b>{now.value.score}</b>/100
            </p>
            <p className="text-muted">{now.value.reason}</p>
            <Button
              size="sm"
              variant="outline"
              className="mt-2"
              onClick={() => setPinned((p) => [...new Set([...p, name.toUpperCase()])])}
            >
              {t("Pin this spelling")}
            </Button>
          </div>
        ) : null}
      </Card>
      <Card>
        <h3 className="text-base">{t("Optimiser")}</h3>
        <ol className="mt-2 space-y-2 text-sm">
          {ideas.value?.suggestions.map((s) => (
            <li key={s.name} className="flex items-center justify-between gap-2">
              <span>
                <b>{s.name}</b> · {s.score} · {s.edits.join(", ")}
              </span>
              <Button size="sm" variant="ghost" onClick={() => setName(s.name)}>
                {t("Try")}
              </Button>
            </li>
          ))}
        </ol>
      </Card>
      {pinnedScores.length ? (
        <Card className="lg:col-span-2">
          <h3 className="text-base">{t("Pinned spellings")}</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {pinnedScores.map((p) => (
              <div key={p!.name} className="rounded-xl border border-sand p-3 text-sm">
                <div className="font-heading">{p!.name}</div>
                <div>
                  {p!.name_number} (compound {p!.compound ?? "–"}) · fit {signed(p!.fit_total)} ·{" "}
                  {p!.score}/100
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
}

function MobileLab({
  owner,
  rules,
  initial,
}: {
  owner: ProfileResult;
  rules: Rules;
  initial: string;
}) {
  const { t } = useT();
  const [text, setText] = useState(initial || "9876524310");
  const [open, setOpen] = useState(0);
  const [prefix, setPrefix] = useState("");
  const [goal, setGoal] = useState("");
  const numbers = text
    .split(/[\n,]+/)
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 20);
  const res = attempt(() =>
    computeMobile(
      {
        numbers,
        ...(goal ? { goals: [goal] } : {}),
        ...(prefix.length >= 6 ? { find_for: prefix } : {}),
      },
      owner,
      rules,
    ),
  );
  const r = res.value;
  const reading = r?.readings[open] ?? r?.readings[0];
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="space-y-3">
        <Field id="lab-mobiles" label={t("Numbers (up to 20, one per line)")}>
          <textarea
            id="lab-mobiles"
            className="min-h-32 w-full rounded-xl border border-sand p-3 font-mono text-sm"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </Field>
        <Problem message={res.error} />
        {r ? (
          <ol className="space-y-1 text-sm">
            {r.ranked.map((x) => (
              <li key={x.input}>
                <button
                  type="button"
                  className="underline-offset-2 hover:underline"
                  onClick={() => setOpen(r.readings.findIndex((y) => y.input === x.input))}
                >
                  {x.input}
                </button>{" "}
                · <b>{x.score}</b> · {x.verdict.replace(/_/g, " ")}
              </li>
            ))}
          </ol>
        ) : null}
      </Card>
      {reading ? (
        <Card className="space-y-2 text-sm">
          <h3 className="text-base">{reading.input}</h3>
          <p>
            Total {reading.total.chain.join(" → ")} ({reading.planet}) · fit{" "}
            {signed(reading.fit.total)} · score {reading.score.value}
          </p>
          {reading.flow ? <FlowStrip pairs={reading.flow.pairs} /> : null}
          <p>
            Fills Lo Shu gaps: {reading.counts.fills_loshu_gaps.join(", ") || "none"} · go easy on:{" "}
            {reading.counts.go_easy_present.join(", ") || "none"}
          </p>
          <p>
            Last 4: {reading.last4.digits} → {formatValue(reading.last4.total)}
          </p>
        </Card>
      ) : null}
      <Card className="space-y-3 lg:col-span-2">
        <h3 className="text-base">{t("Find new endings")}</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field id="lab-prefix" label={t("Prefix or full number (first 6 digits are kept)")}>
            <Input id="lab-prefix" value={prefix} onChange={(e) => setPrefix(e.target.value)} />
          </Field>
          <Field id="lab-goal" label={t("Goal")}>
            <Select id="lab-goal" value={goal} onChange={(e) => setGoal(e.target.value)}>
              <option value="">{t("Any")}</option>
              <option value="finance">{t("Finance")}</option>
              <option value="business_growth">{t("Business growth")}</option>
              <option value="career">{t("Career")}</option>
              <option value="peace_of_mind">{t("Peace of mind")}</option>
              <option value="relationships">{t("Relationships")}</option>
            </Select>
          </Field>
        </div>
        {r?.candidates ? (
          <p className="text-sm">
            Targets {r.target_totals.join(", ")}:{" "}
            {r.candidates.endings.map((e) => `${e.ending} (${e.score})`).join(" · ")}
          </p>
        ) : (
          <p className="text-sm text-muted">{t("Enter at least 6 digits.")}</p>
        )}
      </Card>
    </div>
  );
}

function VehicleLab({ owner, rules }: { owner: ProfileResult; rules: Rules }) {
  const { t } = useT();
  const [regs, setRegs] = useState("KA 05 MN 1234");
  const [flat, setFlat] = useState("12B");
  const [door, setDoor] = useState<"N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW" | "">("E");
  const v = attempt(() =>
    computeVehicle(
      regs
        .split(/[\n,]+/)
        .map((x) => x.trim())
        .filter(Boolean),
      owner,
      rules,
    ),
  );
  const h = attempt(() =>
    computeHouse({ ...(flat ? { flat } : {}), ...(door ? { door } : {}) }, [owner], rules),
  );
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="space-y-3 text-sm">
        <Field id="lab-regs" label={t("Registrations")}>
          <Input id="lab-regs" value={regs} onChange={(e) => setRegs(e.target.value)} />
        </Field>
        <Problem message={v.error} />
        {v.value?.readings.map((r) => (
          <p key={r.registration}>
            {r.registration}: full {r.full.total.chain.join(" → ")}, digits{" "}
            {r.digits_only.total.chain.join(" → ")} · score{" "}
            {(r.headline === "full" ? r.full : r.digits_only).score.value}
          </p>
        ))}
      </Card>
      <Card className="space-y-3 text-sm">
        <div className="grid grid-cols-2 gap-3">
          <Field id="lab-flat" label={t("House or flat number")}>
            <Input id="lab-flat" value={flat} onChange={(e) => setFlat(e.target.value)} />
          </Field>
          <Field id="lab-door" label={t("Door faces")}>
            <Select
              id="lab-door"
              value={door}
              onChange={(e) => setDoor(e.target.value as typeof door)}
            >
              {["", "N", "NE", "E", "SE", "S", "SW", "W", "NW"].map((d) => (
                <option key={d} value={d}>
                  {d || t("Not set")}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Problem message={h.error} />
        {h.value?.numbers.map((n) => (
          <p key={n.input}>
            {n.input} → {n.number.value}: fit {signed(n.residents[0]!.total)}
          </p>
        ))}
        {h.value?.door ? (
          <p>
            Door {h.value.door.direction}:{" "}
            {h.value.door.residents
              .map((r) =>
                r.kind ? `${r.kind.replace(/_/g, " ")} (${r.good ? "good" : "avoid"})` : "no Kua",
              )
              .join(", ")}
          </p>
        ) : null}
      </Card>
    </div>
  );
}

function BusinessLab({
  owner,
  rules,
  clients,
}: {
  owner: ProfileResult;
  rules: Rules;
  clients: Client[];
}) {
  const { t } = useT();
  const [names, setNames] = useState("Loomcraft Works\nMehra Textiles Pvt Ltd");
  const [partnerIds, setPartnerIds] = useState<string[]>([]);
  const [trade, setTrade] = useState("");
  const partners = useMemo(
    () =>
      clients.filter((c) => partnerIds.includes(c.id)).map((c) => profileFor(c.person, rules, 0)),
    [clients, partnerIds, rules],
  );
  const res = attempt(() =>
    computeBusiness(
      {
        names: names
          .split("\n")
          .map((x) => x.trim())
          .filter(Boolean)
          .slice(0, 5),
        ...(trade ? { trade } : {}),
      },
      owner,
      partners.slice(0, 3),
      rules,
    ),
  );
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="space-y-3">
        <Field id="lab-biz" label={t("Names (up to 5, one per line)")}>
          <textarea
            id="lab-biz"
            className="min-h-28 w-full rounded-xl border border-sand p-3 text-sm"
            value={names}
            onChange={(e) => setNames(e.target.value)}
          />
        </Field>
        <fieldset className="text-sm">
          <legend className="font-label">{t("Partners (up to 3)")}</legend>
          {clients.map((c) => (
            <label key={c.id} className="mr-3 inline-flex items-center gap-1">
              <input
                type="checkbox"
                checked={partnerIds.includes(c.id)}
                onChange={() =>
                  setPartnerIds((p) =>
                    p.includes(c.id) ? p.filter((x) => x !== c.id) : [...p, c.id],
                  )
                }
              />
              {c.person.name}
            </label>
          ))}
        </fieldset>
        <Field id="lab-trade" label={t("Trade")}>
          <Select id="lab-trade" value={trade} onChange={(e) => setTrade(e.target.value)}>
            <option value="">{t("Not specified")}</option>
            {[
              "leadership_government",
              "care_service",
              "education_advice",
              "research_technology",
              "trade_media",
              "hospitality_design",
              "manufacturing_long_term",
              "engineering_sport",
            ].map((t) => (
              <option key={t} value={t}>
                {t.replace(/_/g, " ")}
              </option>
            ))}
          </Select>
        </Field>
        <Problem message={res.error} />
      </Card>
      {res.value ? (
        <Card className="space-y-2 text-sm">
          {res.value.names.map((n) => (
            <p key={n.input}>
              {n.rank}. <b>{n.input}</b> · {n.counted.total} → {n.counted.number.value} · total{" "}
              {signed(n.total)}
            </p>
          ))}
          {res.value.spelling_ideas.length ? (
            <p>
              Ideas:{" "}
              {res.value.spelling_ideas.map((s) => `${s.name} (${signed(s.total)})`).join(", ")}
            </p>
          ) : null}
          <p>
            Domains:{" "}
            {res.value.domains.map((d) => `${d.domain} ${d.with_extension.value}`).join(" · ")}
          </p>
          <p>
            Brand: {res.value.brand_kit.planet}, {res.value.brand_kit.day},{" "}
            {res.value.brand_kit.colours.join("/")}; launch days{" "}
            {res.value.brand_kit.launch_days.join(", ")}
          </p>
        </Card>
      ) : null}
    </div>
  );
}

function CompatibilityLab({ clients, rules }: { clients: Client[]; rules: Rules }) {
  const { t } = useT();
  const [a, setA] = useState(clients[0]?.id ?? "");
  const [b, setB] = useState(clients[1]?.id ?? clients[0]?.id ?? "");
  const [rel, setRel] = useState<"couple" | "business_partners" | "parent_child">("couple");
  const ca = clients.find((c) => c.id === a);
  const cb = clients.find((c) => c.id === b);
  const res = attempt(() =>
    computeCompatibility(
      profileFor(ca!.person, rules, 0),
      profileFor(cb!.person, rules, 0),
      rel,
      rules,
    ),
  );
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <ClientPicker clients={clients} value={a} onChange={setA} label={t("First person")} />
        <ClientPicker clients={clients} value={b} onChange={setB} label={t("Second person")} />
        <label className="font-label text-sm">
          {t("Relationship")}
          <Select
            className="mt-1"
            value={rel}
            onChange={(e) => setRel(e.target.value as typeof rel)}
          >
            <option value="couple">{t("Couple")}</option>
            <option value="business_partners">{t("Business partners")}</option>
            <option value="parent_child">{t("Parent and child")}</option>
          </Select>
        </label>
      </div>
      <Problem message={res.error} />
      {res.value ? (
        <Card className="space-y-3 text-sm" data-testid="compat-result">
          <p>
            <span className="font-heading text-3xl">{res.value.score}</span>/100 ·{" "}
            {res.value.band.replace(/_/g, " ")}
          </p>
          <CompatibilityBars
            data={res.value.components.map((c) => ({
              id: c.id,
              label: c.id.replace(/_/g, " "),
              points: c.points,
              weight: c.weight,
            }))}
          />
          <p>
            Shared Lo Shu gaps: {res.value.combined_loshu.shared_gaps.join(", ") || "none"} · good
            joint years:{" "}
            {res.value.timeline
              .filter((t) => t.joint_step)
              .map((t) => t.year)
              .join(", ") || "none"}
          </p>
        </Card>
      ) : null}
    </div>
  );
}

function DateLab({ owner, rules }: { owner: ProfileResult; rules: Rules }) {
  const { t } = useT();
  const today = todayIso();
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(() => {
    const d = new Date(`${today}T00:00:00`);
    d.setDate(d.getDate() + 30);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const [purpose, setPurpose] = useState("launch");
  const res = attempt(() => findDates({ from, to, purpose }, [owner], rules));
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="grid gap-3 sm:grid-cols-3">
        <Field id="lab-from" label={t("From")}>
          <Input id="lab-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </Field>
        <Field id="lab-to" label={t("To")}>
          <Input id="lab-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </Field>
        <Field id="lab-purpose" label={t("Purpose")}>
          <Select id="lab-purpose" value={purpose} onChange={(e) => setPurpose(e.target.value)}>
            <option value="launch">{t("Launch")}</option>
            <option value="signing">{t("Signing")}</option>
            <option value="move">{t("Move")}</option>
            <option value="general">{t("General")}</option>
          </Select>
        </Field>
        <div className="sm:col-span-3">
          <Problem message={res.error} />
        </div>
      </Card>
      {res.value ? (
        <Card>
          <ol className="space-y-1 text-sm">
            {res.value.dates.map((d) => (
              <li key={d.date}>
                <b>{d.date}</b> {d.weekday} · score {d.score} · personal day{" "}
                {d.people[0]?.personal_day}
              </li>
            ))}
          </ol>
        </Card>
      ) : null}
    </div>
  );
}
