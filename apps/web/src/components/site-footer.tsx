"use client";

import Link from "next/link";
import { useT } from "@/i18n/locale";

/** The house disclaimer, on every page (phase 1 spec 5.2). */
export function SiteFooter() {
  const { t } = useT();
  return (
    <footer className="mt-20 bg-ink text-sand">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-[1.2fr_1fr] sm:px-6">
        <div>
          <p className="font-heading text-lg tracking-[0.18em] text-white">KalaChakra</p>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-sand/80">
            {t("Numerology describes tendencies, not certainties. Reports are not medical, legal or financial advice.")}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-6 text-sm">
          <ul className="space-y-2">
            <li>
              <Link href="/choose" className="hover:text-white">{t("Get your report")}</Link>
            </li>
            <li>
              <Link href="/report?sample=1" className="hover:text-white">{t("See a sample report")}</Link>
            </li>
          </ul>
          <ul className="space-y-2">
            <li>
              <Link href="/practitioner" className="hover:text-white">{t("For practitioners")}</Link>
            </li>
            <li className="text-sand/70">{t("Nothing you enter is stored on a server.")}</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-ink-700">
        <p className="mx-auto max-w-6xl px-4 py-4 font-label text-xs text-sand/60 sm:px-6">{t("Phase 1 preview")}</p>
      </div>
    </footer>
  );
}
