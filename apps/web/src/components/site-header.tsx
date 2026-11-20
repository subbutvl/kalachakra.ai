"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@kalachakra/ui";
import { useLocaleStore, useT, type Locale } from "@/i18n/locale";
import { useCustomer } from "@/stores/customer";

/** A small wheel of nine spokes: the brand mark. */
function Mark() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className="h-7 w-7 shrink-0">
      <circle cx="16" cy="16" r="14.5" fill="none" stroke="var(--color-gold)" strokeWidth="1.5" />
      <circle cx="16" cy="16" r="4" fill="var(--color-gold)" />
      {Array.from({ length: 9 }, (_, i) => {
        const a = ((i * 40 - 90) * Math.PI) / 180;
        const at = (r: number, f: (x: number) => number) => Math.round((16 + r * f(a)) * 100) / 100;
        return (
          <line
            key={i}
            x1={at(6, Math.cos)}
            y1={at(6, Math.sin)}
            x2={at(12, Math.cos)}
            y2={at(12, Math.sin)}
            stroke="var(--color-ink)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        );
      })}
    </svg>
  );
}

/** English or Tamil for every screen. The customer's report language follows it until they choose one. */
export function LanguageSwitch({ className }: { className?: string }) {
  const { locale, setLocale } = useLocaleStore();
  const setDetails = useCustomer((s) => s.setDetails);
  const choose = (l: Locale) => {
    setLocale(l);
    setDetails({ language: l });
  };
  return (
    <div
      role="group"
      aria-label="Language / மொழி"
      className={cn("flex items-center font-label text-sm", className)}
    >
      {(
        [
          ["en", "English"],
          ["ta", "தமிழ்"],
        ] as const
      ).map(([l, name], i) => (
        <span key={l} className="flex items-center">
          {i ? <span aria-hidden="true" className="mx-1.5 h-4 w-px bg-ink/20" /> : null}
          <button
            type="button"
            lang={l}
            onClick={() => choose(l)}
            aria-pressed={locale === l}
            className={cn(
              "rounded-md px-1.5 py-1",
              locale === l
                ? "text-ink underline decoration-gold decoration-2 underline-offset-[6px]"
                : "text-muted hover:text-ink",
            )}
          >
            {name}
          </button>
        </span>
      ))}
    </div>
  );
}

/** Brand mark, language and the customer / practitioner switch (phase 1 spec 5.1). */
export function SiteHeader() {
  const path = usePathname();
  const { t } = useT();
  const practitioner = path.startsWith("/practitioner");
  const link = (href: string, on: boolean, text: string) => (
    <Link
      href={href}
      aria-current={on ? "page" : undefined}
      className={cn(
        "whitespace-nowrap rounded-md px-2 py-1",
        on ? "bg-sand-100 text-ink" : "text-muted hover:text-ink",
      )}
    >
      {text}
    </Link>
  );
  return (
    <header className="border-b border-sand bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5" aria-label={t("KalaChakra home")}>
          <Mark />
          <span className="font-heading text-[15px] tracking-[0.18em] text-ink sm:text-lg">
            KalaChakra
          </span>
        </Link>
        <div className="flex items-center gap-3 sm:gap-6">
          <nav aria-label={t("Mode")} className="flex items-center gap-1 font-label text-sm">
            {link("/", !practitioner, t("Customer"))}
            {link("/practitioner", practitioner, t("Practitioner"))}
          </nav>
          <LanguageSwitch />
        </div>
      </div>
    </header>
  );
}
