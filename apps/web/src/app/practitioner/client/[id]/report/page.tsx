"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { ReportDocument } from "@kalachakra/report";
import { Button, Card, Select } from "@kalachakra/ui";
import { api, type ReportRequest } from "@/lib/api";
import { profileRef } from "@/lib/engine";
import {
  newId,
  usePractitioner,
  type Client,
  type ClientReport,
  type OverlayEdit,
} from "@/stores/practitioner";

type Para = { id: string; text: string };
const paras = (s: ReportDocument["sections"][number]): Para[] =>
  s.blocks.flatMap((b) =>
    b.kind === "p" && b.source === "engine" ? [{ id: b.id, text: b.text }] : [],
  );

function freshReport(): ClientReport {
  return {
    id: newId(),
    created: new Date().toISOString(),
    audience: "adult",
    language: "en",
    status: "draft",
    order: [],
    edits: [],
  };
}

/** Edits whose section or paragraph is no longer in the report (phase 1 spec 6.2: "needs attention"). */
function needsAttention(doc: ReportDocument, edits: OverlayEdit[]): OverlayEdit[] {
  return edits.filter((e) => {
    const s = doc.sections.find((x) => x.id === e.section);
    if (!s) return true;
    const block = e.action === "replace" ? e.block : e.action === "hide" ? e.block : e.after;
    return block ? !s.blocks.some((b) => b.kind === "p" && b.id === block) : false;
  });
}

/**
 * The report editor (phase 1 spec 6.2): show, hide and reorder sections, edit
 * a paragraph with the original kept, add notes, set a status, preview and
 * download a branded PDF. The engine's text is never changed; every edit is
 * an overlay applied when the report is built.
 */
export default function ReportEditor() {
  const { id } = useParams<{ id: string }>();
  const { clients, saveReport, settings, profile } = usePractitioner();
  const client = clients.find((c) => c.id === id);
  const [reportId, setReportId] = useState<string | undefined>(client?.reports.at(-1)?.id);
  const [draft] = useState(freshReport);
  const report = client?.reports.find((r) => r.id === reportId) ?? draft;

  if (!client) {
    return (
      <p>
        Client not found. <Link href="/practitioner">Back to clients</Link>
      </p>
    );
  }
  const update = (r: Partial<ClientReport>) => {
    const next = { ...report, ...r };
    saveReport(client.id, next);
    setReportId(next.id);
  };
  const branding = Object.fromEntries(
    Object.entries(settings).filter(([k, v]) => k !== "defaultProfile" && v),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            href={`/practitioner/client/${client.id}`}
            className="font-label text-sm text-muted hover:text-gold-600"
          >
            ← {client.person.name}
          </Link>
          <h1 className="text-2xl sm:text-3xl">Report editor</h1>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          {client.reports.length ? (
            <label className="font-label text-sm">
              Report
              <Select
                className="mt-1 h-9 text-sm"
                value={report.id}
                onChange={(e) => setReportId(e.target.value)}
              >
                {client.reports.map((r, i) => (
                  <option key={r.id} value={r.id}>
                    {i + 1}. {r.created.slice(0, 10)} · {r.status}
                  </option>
                ))}
                {!client.reports.some((r) => r.id === draft.id) ? (
                  <option value={draft.id}>New (unsaved)</option>
                ) : null}
              </Select>
            </label>
          ) : null}
          <Button variant="outline" size="sm" onClick={() => update(freshReport())}>
            New report
          </Button>
        </div>
      </div>
      <Editor
        key={`${report.id}-${report.audience}-${report.language}`}
        client={client}
        report={report}
        update={update}
        branding={branding}
        rule_profile={profileRef(profile)}
      />
    </div>
  );
}

function Editor({
  client,
  report,
  update,
  branding,
  rule_profile,
}: {
  client: Client;
  report: ClientReport;
  update: (r: Partial<ClientReport>) => void;
  branding: Record<string, string>;
  rule_profile: unknown;
}) {
  const [open, setOpen] = useState<string>();
  const [preview, setPreview] = useState<string>();
  const base: ReportRequest = useMemo(
    () => ({
      person: client.person,
      audience: report.audience,
      language: report.language,
      rule_profile,
      ...(client.mobiles.length
        ? { modules: { mobile: { numbers: client.mobiles.slice(0, 20) } } }
        : {}),
    }),
    [client, report.audience, report.language, rule_profile],
  );
  // The report as the engine wrote it, without any edits: the editor shows the originals from here.
  const doc = useQuery({
    queryKey: ["practitioner-report", base],
    queryFn: () => api.reportDocument(base),
  });
  const full = (): ReportRequest => ({
    ...base,
    ...(Object.keys(branding).length ? { branding } : {}),
    overlay: {
      report_id: report.id,
      status: report.status,
      order: report.order,
      edits: report.edits,
    },
  });
  const html = useMutation({ mutationFn: () => api.reportHtml(full()), onSuccess: setPreview });
  const pdf = useMutation({
    mutationFn: () => api.reportPdf(full()),
    onSuccess: (blob) => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${doc.data?.file_name ?? "report"}.pdf`;
      a.click();
      URL.revokeObjectURL(a.href);
    },
  });

  if (doc.isPending) return <p className="text-muted">Building the report…</p>;
  if (doc.isError)
    return (
      <p role="alert" className="text-danger">
        {doc.error.message}
      </p>
    );
  const d = doc.data;

  const order = report.order.length
    ? [...report.order, ...d.sections.map((s) => s.id).filter((x) => !report.order.includes(x))]
    : d.sections.map((s) => s.id);
  const sections = order
    .map((sid) => d.sections.find((s) => s.id === sid))
    .filter((s): s is NonNullable<typeof s> => Boolean(s));
  const hiddenSection = (sid: string) =>
    report.edits.some((e) => e.action === "hide" && e.section === sid && !e.block);
  const hiddenPara = (sid: string, bid: string) =>
    report.edits.some((e) => e.action === "hide" && e.section === sid && e.block === bid);
  const replaced = (sid: string, bid: string) =>
    report.edits.find(
      (e): e is Extract<OverlayEdit, { action: "replace" }> =>
        e.action === "replace" && e.section === sid && e.block === bid,
    );
  const notes = (sid: string) =>
    report.edits
      .map((e, i) => [e, i] as const)
      .filter(([e]) => e.action === "add_note" && e.section === sid);
  const without = (pred: (e: OverlayEdit) => boolean) => report.edits.filter((e) => !pred(e));
  const attention = needsAttention(d, report.edits);

  const move = (sid: string, by: -1 | 1) => {
    const next = [...order];
    const i = next.indexOf(sid);
    const j = i + by;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j]!, next[i]!];
    update({ order: next });
  };
  const toggleSection = (sid: string) =>
    update({
      edits: hiddenSection(sid)
        ? without((e) => e.action === "hide" && e.section === sid && !e.block)
        : [...report.edits, { action: "hide", section: sid }],
    });
  const togglePara = (sid: string, bid: string) =>
    update({
      edits: hiddenPara(sid, bid)
        ? without((e) => e.action === "hide" && e.section === sid && e.block === bid)
        : [...report.edits, { action: "hide", section: sid, block: bid }],
    });
  const setText = (sid: string, p: Para, text: string) => {
    const rest = without((e) => e.action === "replace" && e.section === sid && e.block === p.id);
    update({
      edits:
        text.trim() && text !== p.text
          ? [...rest, { action: "replace", section: sid, block: p.id, text }]
          : rest,
    });
  };

  return (
    <div className="space-y-6">
      <Card className="flex flex-wrap items-end gap-4">
        <label className="font-label text-sm">
          Audience
          <Select
            className="mt-1 h-9 text-sm"
            value={report.audience}
            onChange={(e) => update({ audience: e.target.value as ClientReport["audience"] })}
          >
            <option value="adult">Adult</option>
            <option value="child">Child</option>
          </Select>
        </label>
        <label className="font-label text-sm">
          Language
          <Select
            className="mt-1 h-9 text-sm"
            value={report.language}
            onChange={(e) => update({ language: e.target.value as ClientReport["language"] })}
          >
            <option value="en">English</option>
            <option value="ta">தமிழ்</option>
          </Select>
        </label>
        <label className="font-label text-sm">
          Status
          <Select
            className="mt-1 h-9 text-sm"
            value={report.status}
            onChange={(e) => update({ status: e.target.value as ClientReport["status"] })}
          >
            <option value="draft">Draft</option>
            <option value="reviewed">Reviewed</option>
            <option value="ready">Ready</option>
          </Select>
        </label>
        <div className="ml-auto flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => html.mutate()} disabled={html.isPending}>
            {html.isPending ? "Building…" : "Preview"}
          </Button>
          <Button onClick={() => pdf.mutate()} disabled={pdf.isPending}>
            {pdf.isPending ? "Making PDF…" : "Download PDF"}
          </Button>
        </div>
        <p className="w-full font-label text-xs text-muted">
          {report.edits.length} edit{report.edits.length === 1 ? "" : "s"} · {d.sections.length}{" "}
          sections · rules {d.meta.rules} ({d.meta.profile}) · texts {d.meta.texts}
          {Object.keys(branding).length ? " · your branding" : " · add your branding in Settings"}
        </p>
        {html.error || pdf.error ? (
          <p role="alert" className="w-full text-sm text-danger">
            {(html.error ?? pdf.error)!.message}
          </p>
        ) : null}
      </Card>

      {attention.length ? (
        <Card className="border-danger" data-testid="needs-attention">
          <h2 className="text-lg">Needs attention</h2>
          <p className="mt-1 text-sm text-muted">
            These edits point at text that is no longer in the report, for example after a rule
            profile change. They are left out of the PDF.
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            {attention.map((e, i) => (
              <li key={i} className="flex items-center justify-between gap-3">
                <span>
                  {e.action.replace("_", " ")} in <b>{e.section}</b>
                  {"text" in e ? `: “${e.text.slice(0, 80)}”` : ""}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => update({ edits: report.edits.filter((x) => x !== e) })}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <ol className="space-y-2">
        {sections.map((s, i) => {
          const hidden = hiddenSection(s.id);
          const edited = report.edits.some(
            (e) => e.section === s.id && !(e.action === "hide" && !e.block),
          );
          return (
            <li
              key={s.id}
              className={`rounded-2xl border bg-white ${hidden ? "border-dashed border-sand opacity-60" : "border-sand"}`}
              data-testid={`section-${s.id}`}
            >
              <div className="flex flex-wrap items-center gap-2 p-3">
                <span className="w-8 font-label text-sm text-gold-600">
                  {hidden
                    ? "–"
                    : i + 1 - sections.slice(0, i).filter((x) => hiddenSection(x.id)).length}
                </span>
                <button
                  type="button"
                  className="flex-1 text-left font-heading"
                  onClick={() => setOpen(open === s.id ? undefined : s.id)}
                  aria-expanded={open === s.id}
                >
                  {s.title}
                  {edited ? (
                    <span className="ml-2 rounded-full bg-sand px-2 py-0.5 font-label text-xs">
                      edited
                    </span>
                  ) : null}
                </button>
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label={`Move ${s.title} up`}
                  onClick={() => move(s.id, -1)}
                  disabled={i === 0}
                >
                  ↑
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label={`Move ${s.title} down`}
                  onClick={() => move(s.id, 1)}
                  disabled={i === sections.length - 1}
                >
                  ↓
                </Button>
                <label className="flex items-center gap-1 font-label text-sm">
                  <input
                    type="checkbox"
                    checked={!hidden}
                    onChange={() => toggleSection(s.id)}
                    aria-label={`Show ${s.title}`}
                  />
                  Show
                </label>
              </div>
              {open === s.id ? (
                <div className="space-y-4 border-t border-sand p-4">
                  {paras(s).length ? null : (
                    <p className="text-sm text-muted">
                      This section is numbers and charts only. You can add a note below it.
                    </p>
                  )}
                  {paras(s).map((p) => {
                    const r = replaced(s.id, p.id);
                    const off = hiddenPara(s.id, p.id);
                    return (
                      <div key={p.id} className={off ? "opacity-50" : ""}>
                        <div className="mb-1 flex items-center justify-between gap-2 font-label text-xs text-muted">
                          <span className="font-mono">{p.id}</span>
                          <span className="flex gap-3">
                            {r ? (
                              <button
                                type="button"
                                className="text-gold-600"
                                onClick={() => setText(s.id, p, p.text)}
                              >
                                Restore original
                              </button>
                            ) : null}
                            <button type="button" onClick={() => togglePara(s.id, p.id)}>
                              {off ? "Show paragraph" : "Hide paragraph"}
                            </button>
                          </span>
                        </div>
                        <textarea
                          aria-label={`Paragraph ${p.id}`}
                          className={`min-h-24 w-full rounded-xl border p-3 text-sm ${r ? "border-gold" : "border-sand"}`}
                          defaultValue={r?.text ?? p.text}
                          onBlur={(e) => setText(s.id, p, e.target.value)}
                        />
                        {r ? (
                          <p className="mt-1 border-l-2 border-sand pl-3 text-xs text-muted">
                            Original: {p.text}
                          </p>
                        ) : null}
                      </div>
                    );
                  })}
                  {notes(s.id).map(([e, k]) => (
                    <div key={k} className="rounded-xl bg-sand-50 p-3 text-sm">
                      <span className="font-label text-xs text-gold-600">Your note</span>
                      <p>{"text" in e ? e.text : ""}</p>
                      <button
                        type="button"
                        className="mt-1 font-label text-xs text-danger"
                        onClick={() => update({ edits: report.edits.filter((_, j) => j !== k) })}
                      >
                        Remove note
                      </button>
                    </div>
                  ))}
                  <NoteForm
                    onAdd={(text) =>
                      update({
                        edits: [...report.edits, { action: "add_note", section: s.id, text }],
                      })
                    }
                  />
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>

      {preview ? (
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg">Preview</h2>
            <Button size="sm" variant="ghost" onClick={() => setPreview(undefined)}>
              Close
            </Button>
          </div>
          <iframe
            title="Report preview"
            srcDoc={preview}
            className="h-[80vh] w-full rounded-xl border border-sand bg-white"
          />
        </Card>
      ) : null}
    </div>
  );
}

function NoteForm({ onAdd }: { onAdd: (text: string) => void }) {
  const [text, setText] = useState("");
  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <textarea
        aria-label="New note"
        placeholder="Add a note in your own words"
        className="min-h-16 flex-1 rounded-xl border border-sand p-3 text-sm"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <Button
        size="sm"
        variant="outline"
        disabled={!text.trim()}
        onClick={() => {
          onAdd(text.trim());
          setText("");
        }}
      >
        Add note
      </Button>
    </div>
  );
}
