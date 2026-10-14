"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CalendarPlus, ExternalLink, Send, Undo2, X } from "lucide-react";
import { toast } from "sonner";
import { setPinStatusAction, setPlannedDateAction } from "@/app/actions/pins";
import { PinStatusBadge } from "@/components/campaigns/status-badge";
import { PinThumb } from "@/components/pins/pin-thumb";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/misc";
import { cn } from "@/lib/utils";
import type { Pin } from "@/types/domain";
import { brand } from "@/lib/brand";

export type CalendarPin = Pin & { campaignName: string };

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Deterministic label (server and browser Intl output can differ, breaking hydration). */
function dayLabel(day: string) {
  const d = new Date(`${day}T00:00:00Z`);
  return `${WEEKDAYS[(d.getUTCDay() + 6) % 7]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

function monthGrid(month: string): string[] {
  const [y, m] = month.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const offset = (first.getUTCDay() + 6) % 7; // Monday-first
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const cells: string[] = [];
  for (let i = 0; i < offset; i++) cells.push("");
  for (let d = 1; d <= days; d++) cells.push(`${month}-${String(d).padStart(2, "0")}`);
  while (cells.length % 7) cells.push("");
  return cells;
}

function PinDialog({ pin, onClose }: { pin: CalendarPin; onClose: () => void }) {
  const router = useRouter();
  const [date, setDate] = useState(pin.plannedFor ?? "");
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, msg: string) =>
    start(async () => {
      const res = await fn();
      if (!res.ok) return void toast.error(res.error ?? "Something went wrong.");
      toast.success(msg);
      router.refresh();
      onClose();
    });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="line-clamp-2">{pin.title}</DialogTitle>
          <DialogDescription>{pin.campaignName}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
          <PinThumb pinId={pin.id} version={pin.updatedAt} alt={pin.altText || pin.title} />
          <div className="space-y-4">
            <PinStatusBadge status={pin.status} />
            <Field label="Planned date" htmlFor="planned" hint={`A reminder for you. ${brand.name} doesn't post automatically.`}>
              <div className="flex gap-2">
                <Input id="planned" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                <Button variant="secondary" disabled={pending || !date || date === pin.plannedFor} onClick={() => run(() => setPlannedDateAction(pin.id, date), "Date updated")}>
                  Save
                </Button>
              </div>
            </Field>
            <div className="flex flex-wrap gap-2">
              {pin.plannedFor ? (
                <Button variant="ghost" size="sm" disabled={pending} onClick={() => run(() => setPlannedDateAction(pin.id, null), "Removed from calendar")}>
                  <X /> Remove date
                </Button>
              ) : null}
              {pin.status === "approved" ? (
                <Button size="sm" disabled={pending} onClick={() => run(() => setPinStatusAction(pin.id, "published"), "Marked as published")}>
                  {pending ? <Spinner /> : <Send />} I've published this on Pinterest
                </Button>
              ) : null}
              {pin.status === "published" ? (
                <Button size="sm" variant="secondary" disabled={pending} onClick={() => run(() => setPinStatusAction(pin.id, "approved"), "Published mark removed")}>
                  <Undo2 /> Undo published
                </Button>
              ) : null}
              <Button asChild size="sm" variant="ghost">
                <Link href={`/campaigns/${pin.campaignId}?pin=${pin.id}`}><ExternalLink /> Open in campaign</Link>
              </Button>
            </div>
            {pin.status === "draft" ? <p className="text-xs text-muted-foreground">Approve this pin in its campaign before marking it as published.</p> : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function UnplannedRow({ pin, defaultDate }: { pin: CalendarPin; defaultDate: string }) {
  const router = useRouter();
  const [date, setDate] = useState(defaultDate);
  const [pending, start] = useTransition();
  return (
    <li className="flex items-center gap-3 py-2.5">
      <div className="w-10 shrink-0"><PinThumb pinId={pin.id} version={pin.updatedAt} alt="" /></div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{pin.title}</p>
        <p className="truncate text-xs text-muted-foreground">{pin.campaignName}</p>
      </div>
      <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-40" aria-label={`Planned date for ${pin.title}`} />
      <Button
        size="sm"
        variant="secondary"
        disabled={pending || !date}
        onClick={() =>
          start(async () => {
            const res = await setPlannedDateAction(pin.id, date);
            if (!res.ok) return void toast.error(res.error);
            toast.success("Added to calendar");
            router.refresh();
          })
        }
      >
        {pending ? <Spinner /> : <CalendarPlus />} Plan
      </Button>
    </li>
  );
}

export function CalendarView({ month, planned, unplanned, today }: { month: string; planned: CalendarPin[]; unplanned: CalendarPin[]; today: string }) {
  const [open, setOpen] = useState<CalendarPin | null>(null);
  const cells = monthGrid(month);
  const byDay = new Map<string, CalendarPin[]>();
  for (const p of planned) if (p.plannedFor) byDay.set(p.plannedFor, [...(byDay.get(p.plannedFor) ?? []), p]);

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <div className="hidden grid-cols-7 border-b border-border bg-surface-muted/60 text-xs font-medium text-muted-foreground sm:grid">
          {WEEKDAYS.map((d) => <div key={d} className="px-2 py-2">{d}</div>)}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-7">
          {cells.map((day, i) => {
            const pins = day ? (byDay.get(day) ?? []) : [];
            if (!day) return <div key={`e${i}`} className="hidden min-h-24 border-b border-r border-border bg-surface-muted/30 sm:block" />;
            return (
              <div key={day} className={cn("min-h-24 border-b border-r border-border p-1.5", pins.length === 0 && "hidden sm:block")}>
                <p className={cn("mb-1 text-xs", day === today ? "inline-flex size-5 items-center justify-center rounded-full bg-accent font-semibold text-accent-foreground" : "text-muted-foreground")}>
                  <span className="sm:hidden">{dayLabel(day)}</span>
                  <span className="hidden sm:inline">{Number(day.slice(8))}</span>
                </p>
                <ul className="space-y-1">
                  {pins.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => setOpen(p)}
                        className={cn(
                          "w-full truncate rounded px-1.5 py-1 text-left text-xs",
                          p.status === "published" ? "bg-foreground text-background" : p.status === "approved" ? "bg-accent-soft text-accent-soft-foreground" : "bg-surface-muted",
                        )}
                        title={p.title}
                      >
                        {p.status === "published" ? "✓ " : ""}
                        {p.title}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
      {planned.length === 0 ? <p className="text-sm text-muted-foreground">Nothing planned this month yet.</p> : null}

      <div className="rounded-lg border border-border bg-surface p-5">
        <h2 className="font-semibold">Approved pins without a date</h2>
        <p className="text-sm text-muted-foreground">Give each pin a day to publish it. Spreading pins out over several weeks keeps your profile active.</p>
        {unplanned.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">All approved pins have dates. Approve more pins in your campaigns to plan them here.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {unplanned.map((p, i) => (
              <UnplannedRow key={p.id} pin={p} defaultDate={new Date(Date.parse(today) + (i + 1) * 86400000).toISOString().slice(0, 10)} />
            ))}
          </ul>
        )}
      </div>
      {open ? <PinDialog pin={open} onClose={() => setOpen(null)} /> : null}
    </div>
  );
}
