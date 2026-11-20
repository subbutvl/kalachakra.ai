"use client";

import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@kalachakra/ui";

/** Renders children only after the browser store has loaded (avoids a flash of empty data). */
export function useHydrated(): boolean {
  const [ok, setOk] = useState(false);
  useEffect(() => setOk(true), []);
  return ok;
}

export function Tabs<T extends string>({ tabs, value, onChange, label }: { tabs: [T, string][]; value: T; onChange: (t: T) => void; label: string }) {
  return (
    <div role="tablist" aria-label={label} className="flex flex-wrap gap-2 border-b border-sand pb-3">
      {tabs.map(([id, name]) => (
        <button
          key={id}
          role="tab"
          type="button"
          aria-selected={value === id}
          onClick={() => onChange(id)}
          className={cn("rounded-full px-4 py-1.5 font-label text-sm", value === id ? "bg-ink text-white" : "text-ink hover:bg-sand-50")}
        >
          {name}
        </button>
      ))}
    </div>
  );
}

/** One number with its label, planet or detail, and an optional change marker (old → new). */
export function NumberTile({ label, value, detail, changed }: { label: string; value: ReactNode; detail?: ReactNode; changed?: string }) {
  return (
    <div className={cn("rounded-2xl border bg-white p-4", changed ? "border-gold ring-2 ring-gold/40" : "border-sand")} data-changed={changed ? "true" : undefined}>
      <div className="font-label text-xs uppercase tracking-wider text-muted">{label}</div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="font-heading text-2xl text-ink">{value}</span>
        {detail ? <span className="font-label text-xs text-muted">{detail}</span> : null}
      </div>
      {changed ? <div className="mt-1 font-label text-xs text-gold-600">was {changed}</div> : null}
    </div>
  );
}

export function Trace({ lines }: { lines?: string[] }) {
  if (!lines?.length) return null;
  return (
    <ul className="mt-2 space-y-0.5 border-l-2 border-gold pl-3 font-label text-xs text-muted">
      {lines.map((l, i) => (
        <li key={i}>{l}</li>
      ))}
    </ul>
  );
}

export function signed(n: number): string {
  return n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : "0";
}

export function downloadJson(name: string, data: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
