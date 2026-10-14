import { brand } from "@/lib/brand";
import { cn } from "@/lib/utils";

/**
 * PinNudge mark: a pin head (dot) with a small forward chevron (the nudge),
 * on a square tile. Deliberately distinct from any platform's logo.
 */
export function LogoMark({ className, title }: { className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-7", className)} role={title ? "img" : undefined} aria-hidden={title ? undefined : true}>
      {title ? <title>{title}</title> : null}
      <rect width="32" height="32" rx="3" fill="#167a4a" />
      <circle cx="12.5" cy="16" r="6" fill="#fbfaf7" />
      <path d="M20.5 10.5 26 16l-5.5 5.5" fill="none" stroke="#fbfaf7" strokeWidth="2.8" strokeLinecap="square" strokeLinejoin="miter" />
    </svg>
  );
}

export function Logo({ className, showName = true }: { className?: string; showName?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark />
      {showName ? <span className="font-display text-[26px] leading-none">{brand.name}</span> : null}
    </span>
  );
}
