import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";

export const metadata: Metadata = { title: "Checkout canceled" };

export default function BillingCancelPage() {
  return (
    <EmptyState
      title="Checkout canceled"
      description="No payment was taken and your plan hasn't changed. You can upgrade any time from Settings."
      action={
        <>
          <Button asChild><Link href="/settings#billing">Back to plans</Link></Button>
          <Button asChild variant="secondary"><Link href="/dashboard">Dashboard</Link></Button>
        </>
      }
    />
  );
}
