"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { addSampleProductAction } from "@/app/actions/products";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/misc";

export function AddSampleProductButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      variant="secondary"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await addSampleProductAction();
          if (!res.ok) return void toast.error(res.error);
          toast.success("Sample product added", { description: "It's labelled as a sample so it won't be confused with your real listings." });
          router.push(`/products/${res.data.id}`);
        })
      }
    >
      {pending ? <Spinner /> : null} Use a sample product
    </Button>
  );
}
