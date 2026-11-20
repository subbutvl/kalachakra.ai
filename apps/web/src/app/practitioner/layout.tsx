"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@kalachakra/ui";
import { PROFILE_OPTIONS } from "@/lib/engine";
import { usePractitioner } from "@/stores/practitioner";
import { useHydrated } from "@/components/practitioner/common";

const NAV = [
  ["/practitioner", "Clients"],
  ["/practitioner/labs", "Labs"],
  ["/practitioner/rules", "Rule profile"],
  ["/practitioner/settings", "Settings"],
] as const;

export default function PractitionerLayout({ children }: { children: ReactNode }) {
  const path = usePathname();
  const profile = usePractitioner((s) => s.profile);
  const hydrated = useHydrated();
  const label =
    profile.kind === "custom"
      ? "Custom profile"
      : (PROFILE_OPTIONS.find((p) => p.id === profile.id)?.label ?? profile.id);
  return (
    <div>
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <nav aria-label="Practitioner" className="flex flex-wrap gap-1 font-label text-sm">
          {NAV.map(([href, name]) => {
            const active =
              href === "/practitioner"
                ? path === href || path.startsWith("/practitioner/client")
                : path.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "rounded-full px-4 py-1.5",
                  active ? "bg-sand text-ink" : "text-muted hover:text-ink",
                )}
                aria-current={active ? "page" : undefined}
              >
                {name}
              </Link>
            );
          })}
        </nav>
        <Link
          href="/practitioner/rules"
          className="font-label text-xs text-muted hover:text-ink"
          data-testid="profile-badge"
        >
          Rules: <span className="text-gold-600">{hydrated ? label : "…"}</span>
        </Link>
      </div>
      {hydrated ? children : <p className="text-muted">Loading your desk…</p>}
      <p className="mt-12 text-center font-label text-xs text-muted">
        Simulation: everything here is kept in this browser only. Export the client list to move it
        to another computer.
      </p>
    </div>
  );
}
