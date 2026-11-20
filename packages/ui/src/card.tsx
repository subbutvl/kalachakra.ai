import type { HTMLAttributes } from "react";
import { cn } from "./cn.js";

/** A plain panel: a hairline of sand on white. Hierarchy comes from layout, not shadows. */
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-card border border-sand bg-white p-5 sm:p-6", className)}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("font-heading text-lg tracking-wide text-ink", className)} {...props} />;
}

export function CardText({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("mt-2 text-sm text-muted", className)} {...props} />;
}
