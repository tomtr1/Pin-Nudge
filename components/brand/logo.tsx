import { brand } from "@/lib/brand";
import { cn } from "@/lib/utils";

/**
 * PinNudge mark: a simple dot (the "pin") with a small forward chevron (the
 * "nudge"). Deliberately distinct from any platform's logo.
 */
export function LogoMark({ className, title }: { className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-7", className)} role={title ? "img" : undefined} aria-hidden={title ? undefined : true}>
      {title ? <title>{title}</title> : null}
      <rect width="32" height="32" rx="8" fill="#4f7a5f" />
      <circle cx="13" cy="16" r="5.5" fill="#f7f7f4" />
      <path d="M21 11.5 25.5 16 21 20.5" fill="none" stroke="#f7f7f4" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo({ className, showName = true }: { className?: string; showName?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark />
      {showName ? <span className="text-[17px] font-semibold tracking-tight">{brand.name}</span> : null}
    </span>
  );
}
