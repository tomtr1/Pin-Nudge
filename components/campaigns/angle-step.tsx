"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { generateAnglesAction, generatePinsAction, updateAngleAction } from "@/app/actions/campaigns";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/input";
import { EmptyState, Notice, Spinner } from "@/components/ui/misc";
import type { ActionResult } from "@/lib/actions";
import { cn } from "@/lib/utils";
import type { CampaignAngle, CampaignWithDetails } from "@/types/domain";
import { UpgradeHint } from "./upgrade-hint";

function AngleCard({ angle, onChange, disabled }: { angle: CampaignAngle; onChange: (a: CampaignAngle) => void; disabled: boolean }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(angle);
  const [saving, start] = useTransition();
  const save = (next: CampaignAngle) =>
    start(async () => {
      const res = await updateAngleAction({ ...next, keywords: next.keywords });
      if (!res.ok) return void toast.error(res.error);
      onChange(next);
      setEditing(false);
    });

  return (
    <li className={cn("rounded-lg border bg-surface p-4", angle.selected ? "border-accent/60" : "border-border opacity-70")}>
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          className="mt-1 size-4 accent-[var(--accent)]"
          checked={angle.selected}
          disabled={disabled || saving}
          onChange={(e) => save({ ...angle, selected: e.target.checked })}
          aria-label={`Use angle “${angle.name}”`}
        />
        <div className="min-w-0 flex-1">
          {editing ? (
            <div className="space-y-3">
              <Field label="Angle name" htmlFor={`n-${angle.id}`}>
                <Input id={`n-${angle.id}`} value={draft.name} maxLength={120} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
              </Field>
              <Field label="Audience" htmlFor={`a-${angle.id}`}>
                <Input id={`a-${angle.id}`} value={draft.audience} maxLength={300} onChange={(e) => setDraft({ ...draft, audience: e.target.value })} />
              </Field>
              <Field label="Problem or aspiration" htmlFor={`p-${angle.id}`}>
                <Textarea id={`p-${angle.id}`} rows={2} value={draft.problem} maxLength={500} onChange={(e) => setDraft({ ...draft, problem: e.target.value })} />
              </Field>
              <Field label="Main message" htmlFor={`m-${angle.id}`}>
                <Textarea id={`m-${angle.id}`} rows={2} value={draft.message} maxLength={500} onChange={(e) => setDraft({ ...draft, message: e.target.value })} />
              </Field>
              <Field label="Visual concept" htmlFor={`v-${angle.id}`}>
                <Textarea id={`v-${angle.id}`} rows={2} value={draft.visualConcept} maxLength={500} onChange={(e) => setDraft({ ...draft, visualConcept: e.target.value })} />
              </Field>
              <Field label="Keywords" htmlFor={`k-${angle.id}`} hint="Comma-separated.">
                <Input
                  id={`k-${angle.id}`}
                  value={draft.keywords.join(", ")}
                  onChange={(e) => setDraft({ ...draft, keywords: e.target.value.split(",").map((k) => k.trim()).filter(Boolean) })}
                />
              </Field>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => { setDraft(angle); setEditing(false); }}>Cancel</Button>
                <Button size="sm" onClick={() => save(draft)} disabled={saving || !draft.name.trim()}>
                  {saving ? <Spinner /> : null} Save angle
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold">{angle.name}</h3>
                <Button variant="link" size="sm" className="h-auto" onClick={() => setEditing(true)} disabled={disabled}>Edit</Button>
              </div>
              <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
                <div><dt className="text-xs text-muted-foreground">Audience</dt><dd>{angle.audience}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Problem or aspiration</dt><dd>{angle.problem}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Message</dt><dd>{angle.message}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Visual concept</dt><dd>{angle.visualConcept}</dd></div>
              </dl>
              {angle.keywords.length ? (
                <p className="mt-2 text-xs text-muted-foreground">Keyword ideas: {angle.keywords.join(" · ")}</p>
              ) : null}
            </>
          )}
        </div>
      </div>
    </li>
  );
}

export function AngleStep({ campaign, regenerationsRemaining }: { campaign: CampaignWithDetails; regenerationsRemaining: number }) {
  const router = useRouter();
  const [angles, setAngles] = useState(campaign.angles);
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<"angles" | "pins" | null>(null);
  const [lastError, setLastError] = useState<Extract<ActionResult, { ok: false }> | null>(null);
  const selected = angles.filter((a) => a.selected).length;

  const run = (kind: "angles" | "pins") =>
    start(async () => {
      setBusy(kind);
      setLastError(null);
      const res = kind === "angles" ? await generateAnglesAction(campaign.id) : await generatePinsAction(campaign.id);
      setBusy(null);
      if (!res.ok) {
        setLastError(res);
        toast.error(res.error);
        return;
      }
      if (kind === "angles") setAngles(res.data.angles);
      toast.success(kind === "angles" ? "New angles ready" : "Pins generated", { description: kind === "pins" ? "Review and edit them below." : undefined });
      router.refresh();
    });

  if (angles.length === 0) {
    return (
      <EmptyState
        icon={<Sparkles />}
        title="Generate marketing angles"
        description="Your campaign settings are saved. Generate a set of distinct angles to build the pins from."
        action={
          <div className="flex flex-col items-center gap-3">
            {lastError ? <Notice tone="danger" className="text-left">{lastError.error}{lastError.upgradeTo ? <UpgradeHint plan={lastError.upgradeTo} /> : null}</Notice> : null}
            <Button onClick={() => run("angles")} disabled={pending} size="lg">
              {busy === "angles" ? <Spinner /> : <Sparkles />} {busy === "angles" ? "Generating angles…" : lastError ? "Try again" : "Generate angles"}
            </Button>
          </div>
        }
      />
    );
  }

  return (
    <Card>
      <CardContent className="space-y-5 pt-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="font-display text-3xl">Review the marketing angles</h2>
            <p className="text-sm text-muted-foreground">
              Each angle targets a different audience or need. Edit them, untick any you don't want, then generate the pins.
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => run("angles")} disabled={pending || regenerationsRemaining <= 0}>
            {busy === "angles" ? <Spinner /> : <RefreshCw />} Regenerate angles
          </Button>
        </div>
        <ul className="space-y-3">
          {angles.map((a) => (
            <AngleCard key={a.id} angle={a} disabled={pending} onChange={(next) => setAngles((list) => list.map((x) => (x.id === next.id ? next : x)))} />
          ))}
        </ul>
        {lastError ? (
          <Notice tone="danger" title="That didn't work">
            {lastError.error} {lastError.upgradeTo ? <UpgradeHint plan={lastError.upgradeTo} /> : null}
          </Notice>
        ) : null}
        {selected > campaign.config.pinCount ? (
          <Notice tone="warning">You've selected more angles than pins ({campaign.config.pinCount}). Untick some angles first.</Notice>
        ) : null}
        <div className="flex flex-col gap-2 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            {campaign.config.pinCount} pins across {selected} selected angle{selected === 1 ? "" : "s"}. Regenerating angles uses 1 regeneration ({regenerationsRemaining} left).
          </p>
          <Button size="lg" onClick={() => run("pins")} disabled={pending || selected === 0 || selected > campaign.config.pinCount}>
            {busy === "pins" ? <Spinner /> : <Sparkles />} {busy === "pins" ? "Writing your pins…" : "Generate pins"}
          </Button>
        </div>
        {busy === "pins" ? (
          <p className="text-right text-xs text-muted-foreground" role="status" aria-live="polite">This can take up to a minute.</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
