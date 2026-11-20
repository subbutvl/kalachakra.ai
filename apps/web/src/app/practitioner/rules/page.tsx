"use client";

import { useMemo, useState } from "react";
import { z } from "zod";
import { settingShapes, type SettingKey } from "@kalachakra/engine";
import { Button, Card, Select } from "@kalachakra/ui";
import { catalog, describeRules, diffResults, PROFILE_OPTIONS, profileFor, rulesFor, type ProfileChoice } from "@/lib/engine";
import { usePractitioner } from "@/stores/practitioner";

/** A control for one setting, chosen from its schema. */
function SettingControl({ k, value, onChange }: { k: SettingKey; value: unknown; onChange: (v: unknown) => void }) {
  const shape = settingShapes[k] as z.ZodType;
  const [draft, setDraft] = useState(JSON.stringify(value));
  const [bad, setBad] = useState(false);
  if (shape instanceof z.ZodEnum) {
    return (
      <Select aria-label={k} value={String(value)} onChange={(e) => onChange(e.target.value)} className="h-9 text-sm">
        {(shape.options as string[]).map((o) => (
          <option key={o} value={o}>
            {o.replace(/_/g, " ")}
          </option>
        ))}
      </Select>
    );
  }
  if (shape instanceof z.ZodBoolean) {
    return (
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" aria-label={k} checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />
        {value ? "on" : "off"}
      </label>
    );
  }
  if (k === "optimizer.max_edits") {
    return (
      <Select aria-label={k} value={String(value)} onChange={(e) => onChange(Number(e.target.value))} className="h-9 text-sm">
        {[1, 2, 3].map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </Select>
    );
  }
  // Lists and tables: edit as JSON, checked against the setting's schema.
  return (
    <div>
      <input
        aria-label={k}
        className={`h-9 w-full rounded-xl border px-3 font-mono text-xs ${bad ? "border-danger" : "border-sand"}`}
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          try {
            const v = JSON.parse(e.target.value);
            const ok = shape.safeParse(v).success;
            setBad(!ok);
            if (ok) onChange(v);
          } catch {
            setBad(true);
          }
        }}
      />
      {bad ? <p className="text-xs text-danger">Not a valid value for this setting.</p> : null}
    </div>
  );
}

/**
 * Rule profile switch (phase 1 spec 6.1): choose a profile or make a custom
 * one; every one of the 24 decisions is listed with its value and source, and
 * the numbers that change for a client are shown with old and new values.
 */
export default function Rules() {
  const { profile, setProfile, clients } = usePractitioner();
  const [compareTo, setCompareTo] = useState<ProfileChoice>({ kind: "id", id: "house-default" });
  const [clientId, setClientId] = useState(clients[0]?.id ?? "");
  const rules = useMemo(() => rulesFor(profile), [profile]);
  const rows = describeRules(rules);
  const overrides = profile.kind === "custom" ? profile.overrides : {};

  const client = clients.find((c) => c.id === clientId);
  const changes = useMemo(() => {
    if (!client) return [];
    const a = profileFor(client.person, rulesFor(compareTo), 0);
    const b = profileFor(client.person, rules, 0);
    return diffResults(a, b);
  }, [client, compareTo, rules]);

  const setOne = (k: string, v: unknown) => {
    // A custom profile starts from the profile in use, so its other switches are kept.
    const base =
      profile.kind === "custom"
        ? profile.overrides
        : ((catalog.profiles[profile.id] as { overrides?: Record<string, unknown> } | undefined)?.overrides ?? {});
    setProfile({ kind: "custom", overrides: { ...base, [k]: v } });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl sm:text-3xl">Rule profile</h1>
      <Card className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <label className="flex-1 font-label text-sm">
          Profile in use
          <Select
            className="mt-1"
            value={profile.kind === "custom" ? "custom" : profile.id}
            onChange={(e) => setProfile(e.target.value === "custom" ? { kind: "custom", overrides } : { kind: "id", id: e.target.value })}
          >
            {PROFILE_OPTIONS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
            <option value="custom">Custom</option>
          </Select>
        </label>
        {profile.kind === "custom" ? (
          <Button variant="outline" onClick={() => setProfile({ kind: "custom", overrides: {} })}>
            Reset custom to house default
          </Button>
        ) : null}
      </Card>

      <Card>
        <h2 className="text-lg">What changes for a client</h2>
        {clients.length ? (
          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <label className="flex-1 font-label text-sm">
              Client
              <Select className="mt-1" value={clientId} onChange={(e) => setClientId(e.target.value)}>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.person.name}
                  </option>
                ))}
              </Select>
            </label>
            <label className="flex-1 font-label text-sm">
              Compared with
              <Select className="mt-1" value={compareTo.kind === "id" ? compareTo.id : "custom"} onChange={(e) => setCompareTo({ kind: "id", id: e.target.value })}>
                {PROFILE_OPTIONS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </Select>
            </label>
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted">Add a client to see which numbers change.</p>
        )}
        {client ? (
          changes.length ? (
            <table className="mt-4 w-full text-sm" data-testid="rule-changes">
              <thead>
                <tr className="bg-sand text-left font-label">
                  <th className="p-2">Result</th>
                  <th className="p-2">Before</th>
                  <th className="p-2">Now</th>
                </tr>
              </thead>
              <tbody>
                {changes.slice(0, 60).map((c) => (
                  <tr key={c.path} className="border-b border-sand">
                    <td className="p-2 font-mono text-xs">{c.path}</td>
                    <td className="p-2">{JSON.stringify(c.a)}</td>
                    <td className="p-2 font-medium text-gold-600">{JSON.stringify(c.b)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="mt-4 text-sm text-muted">No numbers change for {client.person.name}.</p>
          )
        ) : null}
      </Card>

      <Card>
        <h2 className="text-lg">The 24 decisions</h2>
        <p className="mt-1 text-sm text-muted">Change any value to switch to a custom profile; every number re-runs at once.</p>
        <div className="mt-4 divide-y divide-sand">
          {rows.map((r) => (
            <div key={r.key} className="grid gap-2 py-3 sm:grid-cols-[4rem_1fr_16rem] sm:items-center" data-testid={`setting-${r.key}`}>
              <span className="font-label text-xs text-gold-600">{r.decision}</span>
              <div>
                <div className="text-sm">{r.title}</div>
                <div className="font-mono text-xs text-muted">
                  {r.key}
                  {r.source === "profile" || r.key in overrides ? " · changed" : ""}
                </div>
              </div>
              <SettingControl key={`${r.key}-${JSON.stringify(r.value)}`} k={r.key} value={r.value} onChange={(v) => setOne(r.key, v)} />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
