"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteMetricAction } from "@/app/actions/metrics";
import { Button } from "@/components/ui/button";

export function DeleteMetricButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Delete this entry"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await deleteMetricAction(id);
          if (!res.ok) return void toast.error(res.error);
          toast.success("Entry deleted");
          router.refresh();
        })
      }
    >
      <Trash2 />
    </Button>
  );
}
