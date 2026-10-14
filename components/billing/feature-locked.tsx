import Link from "next/link";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";
import type { Plan } from "@/lib/billing/plans";

export function FeatureLocked({ title, description, plan }: { title: string; description: string; plan: Plan }) {
  return (
    <EmptyState
      icon={<Lock />}
      title={title}
      description={description}
      action={
        <Button asChild>
          <Link href="/settings#billing">See the {plan.name} plan</Link>
        </Button>
      }
    />
  );
}
