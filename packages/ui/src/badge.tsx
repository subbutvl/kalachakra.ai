import type { HTMLAttributes } from "react";
import { cn } from "./cn.js";

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md bg-sand-100 px-2 py-0.5 font-label text-xs text-gold-700",
        className,
      )}
      {...props}
    />
  );
}
