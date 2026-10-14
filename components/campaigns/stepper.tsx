import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = ["Product", "Settings", "Angles", "Pins", "Review", "Export"];

export function Stepper({ current }: { current: number }) {
  return (
    <ol className="flex flex-wrap items-center gap-x-2 gap-y-2 text-xs sm:text-sm" aria-label="Campaign progress">
      {STEPS.map((label, i) => {
        const n = i + 1;
        const done = n < current;
        const active = n === current;
        return (
          <li key={label} className="flex items-center gap-2" aria-current={active ? "step" : undefined}>
            <span
              className={cn(
                "flex size-6 items-center justify-center rounded-full border text-xs font-semibold",
                done && "border-accent bg-accent text-accent-foreground",
                active && "border-accent text-accent",
                !done && !active && "border-border-strong text-muted-foreground",
              )}
            >
              {done ? <Check className="size-3.5" aria-hidden /> : n}
            </span>
            <span className={cn(active ? "font-medium text-foreground" : "text-muted-foreground")}>{label}</span>
            {n < STEPS.length ? <span className="hidden h-px w-6 bg-border-strong sm:block" aria-hidden /> : null}
          </li>
        );
      })}
    </ol>
  );
}
