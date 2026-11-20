"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@kalachakra/ui";
import { useHydrated } from "@/components/practitioner/common";
import { useT } from "@/i18n/locale";
import { PROFILE_OPTIONS } from "@/lib/engine";
import { usePractitioner } from "@/stores/practitioner";

const NAV = /* i18n */ [
  ["/practitioner", "Clients", "Everyone you read for"],
  ["/practitioner/labs", "Labs", "Try names, numbers and dates"],
  ["/practitioner/rules", "Rule profile", "How the numbers are worked out"],
  ["/practitioner/settings", "Settings", "Your name and logo on reports"],
] as const;

/** The practitioner's desk: a rail of four rooms beside the work. */
export default function PractitionerLayout({ children }: { children: ReactNode }) {
  const { t } = useT();
  const path = usePathname();
  const profile = usePractitioner((s) => s.profile);
  const name = usePractitioner((s) => s.settings.name);
  const hydrated = useHydrated();
  const label =
    profile.kind === "custom"
      ? t("Custom profile")
      : t(PROFILE_OPTIONS.find((p) => p.id === profile.id)?.label ?? profile.id);
  return (
    <div className="grid gap-8 lg:grid-cols-[15rem_1fr] lg:gap-10">
      <aside className="lg:sticky lg:top-6 lg:self-start">
        <div className="rounded-card bg-ink p-4 text-sand lg:p-5">
          <p className="font-label text-xs text-sand/60">{t("Practitioner desk")}</p>
          <p className="mt-1 truncate font-heading text-lg text-white">
            {hydrated && name ? name : "KalaChakra"}
          </p>
          <nav
            aria-label={t("Practitioner")}
            className="mt-4 grid grid-cols-2 gap-1 sm:grid-cols-4 lg:grid-cols-1"
          >
            {NAV.map(([href, title, hint]) => {
              const active =
                href === "/practitioner"
                  ? path === href || path.startsWith("/practitioner/client")
                  : path.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "rounded-lg px-3 py-2 font-label text-sm",
                    active ? "bg-gold text-ink" : "text-sand hover:bg-ink-700 hover:text-white",
                  )}
                >
                  {t(title)}
                  <span
                    className={cn(
                      "hidden text-xs lg:block",
                      active ? "text-ink/70" : "text-sand/50",
                    )}
                  >
                    {t(hint)}
                  </span>
                </Link>
              );
            })}
          </nav>
          <Link
            href="/practitioner/rules"
            className="mt-4 block border-t border-ink-700 pt-3 font-label text-xs text-sand/70 hover:text-white"
            data-testid="profile-badge"
          >
            {t("Rules in use")}
            <span className="mt-0.5 block text-sm text-gold">{hydrated ? label : "…"}</span>
          </Link>
        </div>
        <p className="mt-3 hidden px-1 text-xs leading-relaxed text-muted lg:block">
          {t(
            "Simulation: everything here is kept in this browser only. Export the client list to move it to another computer.",
          )}
        </p>
      </aside>
      <div className="min-w-0">
        {hydrated ? children : <p className="text-muted">{t("Loading your desk…")}</p>}
        <p className="mt-12 text-xs text-muted lg:hidden">
          {t(
            "Simulation: everything here is kept in this browser only. Export the client list to move it to another computer.",
          )}
        </p>
      </div>
    </div>
  );
}
