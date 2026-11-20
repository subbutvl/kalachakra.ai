import { cn } from "@kalachakra/ui";

const STEPS = ["Choose", "Your details", "Check", "Your report"];

export function Steps({ current }: { current: number }) {
  return (
    <ol className="mb-8 flex flex-wrap gap-2 font-label text-xs sm:text-sm" aria-label="Progress">
      {STEPS.map((s, i) => (
        <li
          key={s}
          aria-current={i === current ? "step" : undefined}
          className={cn(
            "flex items-center gap-2 rounded-full border px-3 py-1",
            i === current
              ? "border-gold bg-gold text-white"
              : i < current
                ? "border-gold text-gold-600"
                : "border-sand text-muted",
          )}
        >
          <span>{i + 1}</span>
          {s}
        </li>
      ))}
    </ol>
  );
}
