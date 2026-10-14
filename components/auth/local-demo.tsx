import { HardDrive } from "lucide-react";
import { enterLocalDemoAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/misc";

/** Shown instead of account forms when the server runs in local demo mode. */
export function LocalDemoEntry() {
  return (
    <div className="space-y-4">
      <Notice tone="info" icon={<HardDrive />} title="Local demo mode">
        This server isn't connected to Supabase, so accounts are disabled. You can explore the full workflow as a single local demo user —
        data is stored in a file on this machine and is not suitable for real customers.
      </Notice>
      <form action={enterLocalDemoAction}>
        <Button type="submit" className="w-full" size="lg">
          Continue in local demo
        </Button>
      </form>
    </div>
  );
}
