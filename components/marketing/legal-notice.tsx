import { AlertTriangle } from "lucide-react";
import { Notice } from "@/components/ui/misc";

export function DraftLegalNotice() {
  return (
    <Notice tone="warning" icon={<AlertTriangle />} title="Draft — requires legal review before public launch">
      This document is an initial placeholder written for the product prototype. It has not been reviewed by a lawyer and must be adapted to
      the operating business, its jurisdiction and the services it actually uses before PinNudge accepts real customers.
    </Notice>
  );
}

export function Prose({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-4 text-[15px] leading-relaxed text-foreground/90 [&_h2]:mt-10 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1.5">
      {children}
    </div>
  );
}
