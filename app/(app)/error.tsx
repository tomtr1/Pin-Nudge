"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Page error", error.digest ?? "");
  }, [error]);
  const offline = typeof navigator !== "undefined" && !navigator.onLine;
  return (
    <EmptyState
      icon={<AlertTriangle />}
      title={offline ? "You're offline" : "Something went wrong"}
      description={
        offline
          ? "Check your internet connection and try again. Anything you saved before going offline is safe."
          : "We couldn't load this page. Your saved work is not affected. Please try again."
      }
      action={<Button onClick={reset}>Try again</Button>}
    />
  );
}
