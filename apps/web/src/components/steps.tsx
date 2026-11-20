"use client";

import { cn } from "@kalachakra/ui";
import { useT } from "@/i18n/locale";

const STEPS = /* i18n */ ["Choose", "Your details", "Check", "Your report"] as const;

/** Where the customer is in the four steps: a line that fills in gold. */
export function Steps({ current }: { current: number }) {
  const { t } = useT();
  return (
    <ol
      className="mb-10 grid grid-cols-4 gap-2 font-label text-xs sm:text-sm"
      aria-label={t("Progress")}
    >
      {STEPS.map((s, i) => (
        <li
          key={s}
          aria-current={i === current ? "step" : undefined}
          className="flex flex-col gap-2"
        >
          <span className={cn("h-1 rounded-full", i <= current ? "bg-gold" : "bg-sand")} />
          <span
            className={cn(
              i === current ? "font-medium text-ink" : i < current ? "text-gold-700" : "text-muted",
            )}
          >
            <span className="mr-1 hidden sm:inline">{i + 1}.</span>
            {t(s)}
          </span>
        </li>
      ))}
    </ol>
  );
}
