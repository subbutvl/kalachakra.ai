"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@kalachakra/ui";

/** Brand mark and the Customer / Practitioner switch (phase 1 spec 5.1). */
export function SiteHeader() {
  const path = usePathname();
  const practitioner = path.startsWith("/practitioner");
  return (
    <header className="border-b border-sand bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link
          href="/"
          className="font-heading text-sm tracking-[0.12em] text-ink sm:text-lg sm:tracking-[0.25em]"
          aria-label="KalaChakra home"
        >
          KALA<span className="text-gold">CHAKRA</span>
        </Link>
        <nav
          aria-label="Mode"
          className="flex shrink-0 rounded-full border border-sand p-1 font-label text-xs sm:text-sm"
        >
          <Link
            href="/"
            className={cn(
              "rounded-full px-3 py-1.5 sm:px-4",
              !practitioner ? "bg-ink text-white" : "text-ink hover:bg-sand-50",
            )}
            aria-current={!practitioner ? "page" : undefined}
          >
            Customer
          </Link>
          <Link
            href="/practitioner"
            className={cn(
              "rounded-full px-3 py-1.5 sm:px-4",
              practitioner ? "bg-ink text-white" : "text-ink hover:bg-sand-50",
            )}
            aria-current={practitioner ? "page" : undefined}
          >
            Practitioner
          </Link>
        </nav>
      </div>
    </header>
  );
}
