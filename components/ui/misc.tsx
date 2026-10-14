import * as React from "react";
import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("animate-pulse rounded-md bg-surface-muted", className)} aria-hidden {...props} />;
}

export function Separator({ className }: { className?: string }) {
  return <hr className={cn("border-0 border-t border-border", className)} />;
}

export function Progress({ value, max = 100, label, className }: { value: number; max?: number; label: string; className?: string }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      className={cn("h-2 w-full overflow-hidden rounded-[1px] bg-surface-muted", className)}
    >
      <div
        className={cn("h-full transition-[width]", pct >= 100 ? "bg-ink-tomato" : "bg-accent")}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cn("size-4 animate-spin", className)} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function Notice({
  tone = "info",
  title,
  children,
  className,
  icon,
  action,
}: {
  tone?: "info" | "warning" | "danger" | "accent" | "neutral";
  title?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}) {
  const tones = {
    info: "bg-block-sky text-[#1b3a74] border-[#1b3a74]/25",
    warning: "bg-block-butter text-[#5c3d06] border-[#5c3d06]/25",
    danger: "bg-block-blush text-danger border-danger/30",
    accent: "bg-block-mint text-accent-soft-foreground border-accent/30",
    neutral: "bg-surface-muted text-foreground border-border",
  } as const;
  return (
    <div
      className={cn("flex items-start gap-3 rounded-[3px] border px-4 py-3 text-sm", tones[tone], className)}
      role={tone === "danger" ? "alert" : "status"}
    >
      {icon ? <div className="mt-0.5 shrink-0 [&_svg]:size-4">{icon}</div> : null}
      <div className="min-w-0 flex-1 space-y-0.5">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className="text-[13px] leading-relaxed opacity-90">{children}</div> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid-paper flex flex-col items-center justify-center rounded-[4px] border border-border bg-surface px-6 py-14 text-center", className)}>
      {icon ? <div className="mb-4 border border-foreground bg-block-mint p-3 text-foreground shadow-[3px_3px_0_0_var(--foreground)] [&_svg]:size-5">{icon}</div> : null}
      <h3 className="font-display text-2xl">{title}</h3>
      {description ? <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-5 flex flex-wrap items-center justify-center gap-2">{action}</div> : null}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0">
        <h1 className="font-display text-3xl sm:text-4xl">{title}</h1>
        {description ? <p className="mt-2 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: React.ReactNode }) {
  return (
    <div className="rounded-[4px] border border-border bg-surface p-4">
      <p className="text-[13px] font-medium text-muted-foreground">{label}</p>
      <p className="font-display mt-2 text-4xl tabular-nums">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
