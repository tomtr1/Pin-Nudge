import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-[2px] px-1.5 py-0.5 text-xs font-semibold whitespace-nowrap [&_svg]:size-3",
  {
    variants: {
      tone: {
        neutral: "bg-surface-muted text-muted-foreground",
        accent: "bg-block-mint text-accent-soft-foreground",
        warning: "bg-block-butter text-warning",
        danger: "bg-block-blush text-danger",
        info: "bg-block-sky text-info",
        solid: "bg-foreground text-background",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export function Badge({
  className,
  tone,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
