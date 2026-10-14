import Link from "next/link";
import { PLANS } from "@/lib/billing/plans";
import type { PlanId } from "@/types/domain";

export function UpgradeHint({ plan }: { plan: PlanId }) {
  return (
    <Link href="/settings#billing" className="ml-1 font-medium underline">
      See the {PLANS[plan].name} plan
    </Link>
  );
}
