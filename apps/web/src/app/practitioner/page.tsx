"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { Button, Input } from "@kalachakra/ui";
import { ClientForm } from "@/components/practitioner/client-form";
import { downloadJson } from "@/components/practitioner/common";
import { useT } from "@/i18n/locale";
import { profileFor, rulesFor } from "@/lib/engine";
import { longDate } from "@/lib/validate";
import { usePractitioner, type Client } from "@/stores/practitioner";

const STATUS = /* i18n */ { draft: "Draft", reviewed: "Reviewed", ready: "Ready" } as const;

/** The client desk (phase 1 spec 6.1): a register of clients kept in this browser, with export and import. */
export default function ClientDesk() {
  const { t, locale } = useT();
  const { clients, saveClient, removeClient, duplicateClient, importAll, settings, profile } =
    usePractitioner();
  const [editing, setEditing] = useState<Client | "new" | null>(clients.length ? null : "new");
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState<string>();
  const file = useRef<HTMLInputElement>(null);
  const shown = clients.filter((c) => c.person.name.toLowerCase().includes(query.toLowerCase()));
  const rules = useMemo(() => rulesFor(profile), [profile]);
  const numbers = useMemo(
    () =>
      new Map(
        clients.map((c) => {
          try {
            const p = profileFor(c.person, rules, 0);
            return [
              c.id,
              [
                p.date_numbers.mulank.reduced,
                p.date_numbers.bhagyank.reduced,
                p.chaldean.headline.name_number.number.reduced,
              ],
            ] as const;
          } catch {
            return [c.id, undefined] as const;
          }
        }),
      ),
    [clients, rules],
  );

  const onImport = async (f: File) => {
    try {
      const err = importAll(JSON.parse(await f.text()));
      setMessage(err ? t(err) : t("Clients imported."));
    } catch {
      setMessage(t("That file is not a KalaChakra client list."));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-4xl">{t("Client desk")}</h1>
          <p className="mt-2 text-muted">
            {clients.length
              ? t("{n} clients, kept in this browser.", { n: clients.length })
              : t("Your clients, kept in this browser.")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setEditing("new")}>{t("Add client")}</Button>
          <Button
            variant="outline"
            onClick={() =>
              downloadJson("kalachakra-clients.json", { version: 1, settings, clients })
            }
            disabled={!clients.length}
          >
            {t("Export")}
          </Button>
          <Button variant="outline" onClick={() => file.current?.click()}>
            {t("Import")}
          </Button>
          <input
            ref={file}
            type="file"
            accept="application/json"
            className="hidden"
            aria-label={t("Import client list")}
            onChange={(e) => e.target.files?.[0] && onImport(e.target.files[0])}
          />
        </div>
      </div>
      {message ? (
        <p role="status" className="text-sm text-gold-700">
          {message}
        </p>
      ) : null}

      {editing ? (
        <ClientForm
          key={editing === "new" ? "new" : editing.id}
          initial={editing === "new" ? undefined : editing}
          onCancel={() => setEditing(null)}
          onSave={(c) => {
            saveClient(c);
            setEditing(null);
          }}
        />
      ) : null}

      {clients.length ? (
        <div>
          <Input
            placeholder={t("Search clients")}
            aria-label={t("Search clients")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="max-w-sm"
          />
          <div className="mt-6 hidden grid-cols-[1.6fr_1fr_7.5rem_1.4fr] gap-4 border-b-2 border-ink pb-2 font-label text-sm md:grid">
            <span>{t("Client")}</span>
            <span>{t("Date of birth")}</span>
            <span>{t("Mulank, Bhagyank, name")}</span>
            <span>{t("Reports")}</span>
          </div>
          <ul className="mt-4 divide-y divide-sand border-y border-sand md:mt-0 md:border-t-0">
            {shown.map((c) => {
              const n = numbers.get(c.id);
              const last = c.reports.at(-1);
              return (
                <li
                  key={c.id}
                  className="grid gap-3 py-4 md:grid-cols-[1.6fr_1fr_7.5rem_1.4fr] md:items-center md:gap-4"
                  data-testid="client-card"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/practitioner/client/${c.id}`}
                      className="font-heading text-lg hover:text-gold-700"
                    >
                      {c.person.name}
                    </Link>
                    {c.notes ? <p className="truncate text-sm text-muted">{c.notes}</p> : null}
                  </div>
                  <span className="text-sm">{longDate(c.person.dob, locale)}</span>
                  <span className="flex gap-1.5" aria-label={t("Mulank, Bhagyank, name")}>
                    {n?.map((x, i) => (
                      <span
                        key={i}
                        className={`flex h-8 w-8 items-center justify-center rounded-md font-heading ${i === 0 ? "bg-ink text-gold" : "bg-sand-100"}`}
                      >
                        {x}
                      </span>
                    ))}
                  </span>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="mr-1 text-sm text-muted">
                      {last ? `${c.reports.length} · ${t(STATUS[last.status])}` : t("None yet")}
                    </span>
                    <Button asChild size="sm">
                      <Link href={`/practitioner/client/${c.id}`}>{t("Open")}</Link>
                    </Button>
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/practitioner/client/${c.id}/report`}>{t("Report")}</Link>
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditing(c)}>
                      {t("Edit")}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => duplicateClient(c.id)}>
                      {t("Duplicate")}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-danger"
                      onClick={() => {
                        if (
                          window.confirm(
                            t("Delete {name} from this browser?", { name: c.person.name }),
                          )
                        )
                          removeClient(c.id);
                      }}
                    >
                      {t("Delete")}
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
      {!clients.length && !editing ? (
        <p className="text-muted">{t("No clients yet. Add one to start.")}</p>
      ) : null}
    </div>
  );
}
