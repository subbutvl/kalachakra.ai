import type { HTMLAttributes } from "react";
import { cn } from "./cn.js";

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full bg-sand-50 px-3 py-1 font-label text-xs uppercase tracking-wider text-gold-600",
        className,
      )}
      {...props}
    />
  );
}
