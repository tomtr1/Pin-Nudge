"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { addMetricAction } from "@/app/actions/metrics";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Notice, Spinner } from "@/components/ui/misc";

export interface PinOption {
  id: string;
  title: string;
  campaignName: string;
}

export function MetricForm({ pins, today, weekAgo }: { pins: PinOption[]; today: string; weekAgo: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const groups = new Map<string, PinOption[]>();
  for (const p of pins) groups.set(p.campaignName, [...(groups.get(p.campaignName) ?? []), p]);

  return (
    <form
      className="space-y-4"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const data = Object.fromEntries(new FormData(form).entries());
        start(async () => {
          const res = await addMetricAction(data);
          if (!res.ok) {
            setErrors(res.fieldErrors ?? {});
            setFormError(res.error);
            return;
          }
          setErrors({});
          setFormError(null);
          form.reset();
          toast.success("Results saved", { description: "Recorded as manually reported data." });
          router.refresh();
        });
      }}
    >
      {formError ? <Notice tone="danger">{formError}</Notice> : null}
      <Field label="Pin" htmlFor="pinId" error={errors.pinId}>
        <Select id="pinId" name="pinId" required defaultValue="">
          <option value="" disabled>Choose a pin…</option>
          {[...groups.entries()].map(([campaign, list]) => (
            <optgroup key={campaign} label={campaign}>
              {list.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
            </optgroup>
          ))}
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="From" htmlFor="periodStart" error={errors.periodStart}>
          <Input id="periodStart" name="periodStart" type="date" defaultValue={weekAgo} max={today} required />
        </Field>
        <Field label="To" htmlFor="periodEnd" error={errors.periodEnd}>
          <Input id="periodEnd" name="periodEnd" type="date" defaultValue={today} required />
        </Field>
        <Field label="Impressions" htmlFor="impressions" error={errors.impressions}>
          <Input id="impressions" name="impressions" inputMode="numeric" min={0} type="number" />
        </Field>
        <Field label="Saves" htmlFor="saves" error={errors.saves}>
          <Input id="saves" name="saves" inputMode="numeric" min={0} type="number" />
        </Field>
        <Field label="Pin clicks" htmlFor="pinClicks" error={errors.pinClicks}>
          <Input id="pinClicks" name="pinClicks" inputMode="numeric" min={0} type="number" />
        </Field>
        <Field label="Outbound clicks" htmlFor="outboundClicks" error={errors.outboundClicks}>
          <Input id="outboundClicks" name="outboundClicks" inputMode="numeric" min={0} type="number" />
        </Field>
      </div>
      <Field label="Notes" htmlFor="notes" optional hint="Observations, e.g. “saved to a popular group board”.">
        <Textarea id="notes" name="notes" rows={2} maxLength={1000} />
      </Field>
      <Button type="submit" className="w-full" disabled={pending || pins.length === 0}>
        {pending ? <Spinner /> : null} Save results
      </Button>
      <p className="text-xs text-muted-foreground">Copy these numbers from your Pinterest analytics. Leave a field empty if you don't have it — it won't be counted as zero.</p>
    </form>
  );
}
