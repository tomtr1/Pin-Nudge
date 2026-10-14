/* eslint-disable @next/next/no-img-element -- private, per-user rendered images served by our own API */
import { cn } from "@/lib/utils";

export function PinThumb({ pinId, version, alt, className, size = "thumb" }: { pinId: string; version: string; alt: string; className?: string; size?: "thumb" | "preview" }) {
  return (
    <img
      src={`/api/pins/${pinId}/image?size=${size}&v=${encodeURIComponent(version)}`}
      alt={alt}
      width={300}
      height={450}
      loading="lazy"
      className={cn("aspect-[2/3] w-full rounded-md border border-border bg-surface-muted object-cover", className)}
    />
  );
}

export function PinPlaceholder({ className, label = "No pins yet" }: { className?: string; label?: string }) {
  return (
    <div className={cn("flex aspect-[2/3] w-full items-center justify-center rounded-md border border-dashed border-border-strong bg-surface-muted text-center text-xs text-muted-foreground", className)}>
      {label}
    </div>
  );
}
