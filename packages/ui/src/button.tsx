import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "./cn.js";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-[10px] font-label text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-ink text-white hover:bg-ink-700",
        gold: "bg-gold text-ink hover:bg-[#e2b064]",
        outline: "border border-ink/25 text-ink hover:border-gold hover:bg-sand-50",
        ghost: "text-ink hover:bg-sand-50",
        onInk: "border border-sand/40 text-sand hover:border-gold hover:text-white",
      },
      size: { sm: "h-8 px-3", md: "h-10 px-5", lg: "h-12 px-7 text-base" },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({ className, variant, size, asChild, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
