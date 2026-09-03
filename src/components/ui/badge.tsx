import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium tracking-wide transition-colors",
  {
    variants: {
      variant: {
        default: "border-gold/30 bg-gold/10 text-gold-soft",
        secondary: "border-border bg-secondary text-secondary-foreground",
        outline: "border-border bg-transparent text-muted-foreground",
        success: "border-emerald-600/30 bg-emerald-600/10 text-emerald-300",
        destructive: "border-destructive/40 bg-destructive/15 text-red-300",
        muted: "border-border/70 bg-muted text-muted-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
