"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Button, Card, Input } from "@kalachakra/ui";
import { ClientForm } from "@/components/practitioner/client-form";
import { downloadJson } from "@/components/practitioner/common";
import { longDate } from "@/lib/validate";
import { usePractitioner, type Client } from "@/stores/practitioner";

/** The client desk (phase 1 spec 6.1): clients kept in this browser, with export and import. */
export default function ClientDesk() {
  const { clients, saveClient, removeClient, duplicateClient, importAll, settings } = usePractitioner();
  const [editing, setEditing] = useState<Client | "new" | null>(clients.length ? null : "new");
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState<string>();
  const file = useRef<HTMLInputElement>(null);
  const shown = clients.filter((c) => c.person.name.toLowerCase().includes(query.toLowerCase()));

  const onImport = async (f: File) => {
    try {
      const err = importAll(JSON.parse(await f.text()));
      setMessage(err ?? "Clients imported.");
    } catch {
      setMessage("That file is not a KalaChakra client list.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl">Client desk</h1>
          <p className="mt-1 text-muted">{settings.name ? `${settings.name}'s clients` : "Your clients"}, kept in this browser.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setEditing("new")}>Add client</Button>
          <Button variant="outline" onClick={() => downloadJson("kalachakra-clients.json", { version: 1, settings, clients })} disabled={!clients.length}>
            Export
          </Button>
          <Button variant="outline" onClick={() => file.current?.click()}>
            Import
          </Button>
          <input ref={file} type="file" accept="application/json" className="hidden" aria-label="Import client list" onChange={(e) => e.target.files?.[0] && onImport(e.target.files[0])} />
        </div>
      </div>
      {message ? (
        <p role="status" className="text-sm text-gold-600">
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

      {clients.length ? <Input placeholder="Search clients" aria-label="Search clients" value={query} onChange={(e) => setQuery(e.target.value)} /> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        {shown.map((c) => (
          <Card key={c.id} className="flex flex-col gap-3" data-testid="client-card">
            <div>
              <Link href={`/practitioner/client/${c.id}`} className="font-heading text-lg hover:text-gold-600">
                {c.person.name}
              </Link>
              <p className="text-sm text-muted">
                {longDate(c.person.dob)} · {c.reports.length} report{c.reports.length === 1 ? "" : "s"}
              </p>
              {c.notes ? <p className="mt-2 line-clamp-2 text-sm">{c.notes}</p> : null}
            </div>
            <div className="mt-auto flex flex-wrap gap-2">
              <Button asChild size="sm">
                <Link href={`/practitioner/client/${c.id}`}>Open</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href={`/practitioner/client/${c.id}/report`}>Report</Link>
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(c)}>
                Edit
              </Button>
              <Button size="sm" variant="ghost" onClick={() => duplicateClient(c.id)}>
                Duplicate
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  if (window.confirm(`Delete ${c.person.name} from this browser?`)) removeClient(c.id);
                }}
              >
                Delete
              </Button>
            </div>
          </Card>
        ))}
      </div>
      {!clients.length && !editing ? <p className="text-muted">No clients yet. Add one to start.</p> : null}
    </div>
  );
}
