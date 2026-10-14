import Link from "next/link";
import { AlertTriangle, FlaskConical, HardDrive } from "lucide-react";
import type { Entitlement } from "@/lib/billing/entitlements";

/** Persistent, honest labels for non-production modes and billing problems. */
export function StatusBanners({ dataMode, aiMode, entitlement }: { dataMode: string; aiMode: "live" | "demo"; entitlement: Entitlement }) {
  return (
    <>
      {dataMode === "local" ? (
        <div className="flex items-center gap-2 border-b border-info/20 bg-info-soft px-4 py-2 text-[13px] text-info sm:px-6">
          <HardDrive className="size-4 shrink-0" aria-hidden />
          <span>
            <strong className="font-semibold">Local demo mode.</strong> Data is stored in a file on this server. Connect Supabase before using PinNudge with real customers.
          </span>
        </div>
      ) : null}
      {aiMode === "demo" ? (
        <div className="flex items-center gap-2 border-b border-warning/20 bg-warning-soft px-4 py-2 text-[13px] text-warning sm:px-6">
          <FlaskConical className="size-4 shrink-0" aria-hidden />
          <span>
            <strong className="font-semibold">AI demo mode.</strong> No AI provider is configured, so new campaigns contain sample content assembled from your product details — not AI-generated copy.
          </span>
        </div>
      ) : null}
      {entitlement.paymentIssue || entitlement.status === "past_due" ? (
        <div className="flex items-center gap-2 border-b border-danger/20 bg-danger-soft px-4 py-2 text-[13px] text-danger sm:px-6" role="alert">
          <AlertTriangle className="size-4 shrink-0" aria-hidden />
          <span>
            <strong className="font-semibold">Payment problem.</strong> Your last payment didn't go through. Paid features stay on while Stripe retries.{" "}
            <Link href="/settings#billing" className="underline">Update your payment method</Link>.
          </span>
        </div>
      ) : null}
    </>
  );
}
