"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { openBillingPortalAction, startCheckoutAction } from "@/app/actions/billing";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/misc";
import type { PlanId } from "@/types/domain";

export function CheckoutButton({ plan, label, disabled, variant = "primary" }: { plan: PlanId; label: string; disabled?: boolean; variant?: "primary" | "secondary" }) {
  const [pending, start] = useTransition();
  return (
    <Button
      className="w-full"
      variant={variant}
      disabled={disabled || pending}
      onClick={() =>
        start(async () => {
          const res = await startCheckoutAction(plan);
          if (res && !res.ok) toast.error(res.error);
        })
      }
    >
      {pending ? <Spinner /> : null} {label}
    </Button>
  );
}

export function PortalButton({ disabled }: { disabled?: boolean }) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="secondary"
      disabled={disabled || pending}
      onClick={() =>
        start(async () => {
          const res = await openBillingPortalAction();
          if (res && !res.ok) toast.error(res.error);
        })
      }
    >
      {pending ? <Spinner /> : null} Manage billing
    </Button>
  );
}
