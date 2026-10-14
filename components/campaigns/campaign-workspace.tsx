"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import {
  Archive,
  ArchiveRestore,
  CheckCheck,
  Copy,
  Download,
  FileSpreadsheet,
  FileText,
  FolderArchive,
  MoreHorizontal,
  Pencil,
  RefreshCw,
  Send,
  Trash2,
  Undo2,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";
import { deleteCampaignAction, renameCampaignAction, setCampaignArchivedAction } from "@/app/actions/campaigns";
import { approveAllPinsAction, deletePinAction, duplicatePinAction, regeneratePinAction, setPinStatusAction } from "@/app/actions/pins";
import { PinEditor, type EditorFeatures } from "@/components/pins/pin-editor";
import { PinThumb } from "@/components/pins/pin-thumb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown";
import { Input } from "@/components/ui/input";
import { Notice, Spinner } from "@/components/ui/misc";
import { displayUrl } from "@/lib/validations/url";
import type { CampaignWithDetails, Pin } from "@/types/domain";
import { AngleStep } from "./angle-step";
import { CampaignStatusBadge, PinStatusBadge, SourceBadge } from "./status-badge";
import { Stepper } from "./stepper";
import { brand } from "@/lib/brand";

interface Props {
  campaign: CampaignWithDetails;
  features: EditorFeatures & { zipExport: boolean };
  imageCount: number;
  regenerationsRemaining: number;
  productExists: boolean;
}

function PinCard({
  pin,
  angleName,
  onEdit,
  busy,
  regenerationsRemaining,
}: {
  pin: Pin;
  angleName: string | null;
  onEdit: () => void;
  busy: boolean;
  regenerationsRemaining: number;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const disabled = busy || pending;

  const act = (fn: () => Promise<{ ok: boolean; error?: string }>, success: string) =>
    start(async () => {
      const res = await fn();
      if (!res.ok) return void toast.error(res.error ?? "Something went wrong.");
      toast.success(success);
      router.refresh();
    });

  const regen = (mode: "copy" | "creative") =>
    start(async () => {
      const res = await regeneratePinAction(pin.id, mode, false);
      if (!res.ok) return void toast.error(res.error);
      toast.success(mode === "copy" ? "New copy written" : "New creative concept ready", {
        description: res.data.keptFields.length ? `Kept your edits to: ${res.data.keptFields.join(", ")}.` : undefined,
      });
      router.refresh();
    });

  return (
    <li className="flex flex-col rounded-lg border border-border bg-surface">
      <button type="button" onClick={onEdit} className="relative block rounded-t-lg p-2 pb-0 text-left" aria-label={`Edit pin: ${pin.title}`}>
        <PinThumb pinId={pin.id} version={pin.updatedAt} alt={pin.altText || pin.title} size="preview" />
        {pending ? (
          <span className="absolute inset-2 flex items-center justify-center rounded-md bg-surface/60">
            <Spinner className="size-6 text-accent" />
          </span>
        ) : null}
      </button>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="flex flex-wrap items-center gap-1">
          <PinStatusBadge status={pin.status} />
          {angleName ? <Badge className="max-w-full truncate">{angleName}</Badge> : null}
          {pin.plannedFor ? <Badge tone="info">Planned {pin.plannedFor}</Badge> : null}
        </div>
        <p className="line-clamp-2 text-sm font-medium">{pin.title}</p>
        <p className="line-clamp-2 text-xs text-muted-foreground">{pin.description}</p>
        <p className="truncate text-xs text-muted-foreground">{pin.destinationUrl ? `→ ${displayUrl(pin.destinationUrl, 40)}` : "No destination link"}</p>
        <div className="mt-auto flex items-center gap-1 pt-1">
          {pin.status === "draft" ? (
            <Button size="sm" variant="subtle" className="flex-1" disabled={disabled} onClick={() => act(() => setPinStatusAction(pin.id, "approved"), "Pin approved")}>
              <CheckCheck /> Approve
            </Button>
          ) : pin.status === "approved" ? (
            <Button size="sm" variant="secondary" className="flex-1" disabled={disabled} onClick={() => act(() => setPinStatusAction(pin.id, "draft"), "Moved back to draft")}>
              <Undo2 /> Unapprove
            </Button>
          ) : (
            <span className="flex-1 text-xs text-muted-foreground">Marked as published</span>
          )}
          <Button size="sm" variant="ghost" onClick={onEdit} disabled={disabled} aria-label="Edit pin">
            <Pencil />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="ghost" aria-label="More pin actions" disabled={disabled}>
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem disabled={regenerationsRemaining <= 0} onSelect={() => regen("copy")}><RefreshCw /> Regenerate copy</DropdownMenuItem>
              <DropdownMenuItem disabled={regenerationsRemaining <= 0} onSelect={() => regen("creative")}><Wand2 /> Regenerate creative</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => act(() => duplicatePinAction(pin.id), "Pin duplicated")}><Copy /> Duplicate</DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a href={`/api/pins/${pin.id}/image?download=1&v=${encodeURIComponent(pin.updatedAt)}`} download><Download /> Download PNG</a>
              </DropdownMenuItem>
              {pin.status === "approved" ? (
                <DropdownMenuItem onSelect={() => act(() => setPinStatusAction(pin.id, "published"), "Marked as published")}>
                  <Send /> Mark as published…
                </DropdownMenuItem>
              ) : null}
              {pin.status === "published" ? (
                <DropdownMenuItem onSelect={() => act(() => setPinStatusAction(pin.id, "approved"), "Published mark removed")}>
                  <Undo2 /> Undo “published”
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-danger" onSelect={() => act(() => deletePinAction(pin.id), "Pin deleted")}><Trash2 /> Delete pin</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </li>
  );
}

function ExportPanel({ campaign, zipExport }: { campaign: CampaignWithDetails; zipExport: boolean }) {
  const approved = campaign.pins.filter((p) => p.status === "approved" || p.status === "published").length;
  const base = `/api/campaigns/${campaign.id}/export`;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Export</CardTitle>
        <p className="text-sm text-muted-foreground">
          {approved > 0 ? `${approved} approved pin${approved === 1 ? "" : "s"} ready to export.` : "Approve pins to export them as a batch."}
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {zipExport ? (
          approved > 0 ? (
            <Button asChild className="w-full">
              <a href={`${base}?format=zip&scope=approved`} download><FolderArchive /> Download ZIP (PNGs + CSV)</a>
            </Button>
          ) : (
            <Button className="w-full" disabled><FolderArchive /> Download ZIP</Button>
          )
        ) : (
          <Notice tone="neutral">
            Batch ZIP export is on Growth and Pro. <Link href="/settings#billing" className="font-medium underline">Upgrade</Link> — or download pins one at a time.
          </Notice>
        )}
        <Button asChild variant="secondary" className="w-full">
          <a href={`${base}?format=csv&scope=${approved > 0 ? "approved" : "all"}`} download>
            <FileSpreadsheet /> CSV of {approved > 0 ? "approved" : "all"} pins
          </a>
        </Button>
        <Button asChild variant="secondary" className="w-full">
          <a href={`${base}?format=summary&scope=all`} download><FileText /> Campaign summary</a>
        </Button>
        <p className="pt-1 text-xs text-muted-foreground">
          Upload pins to Pinterest yourself, then mark them as published here. {brand.name} doesn't post on your behalf.
        </p>
      </CardContent>
    </Card>
  );
}

function CampaignHeader({ campaign }: { campaign: CampaignWithDetails }) {
  const router = useRouter();
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(campaign.name);
  const [pending, start] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="mb-6 space-y-3">
      <nav className="text-sm text-muted-foreground" aria-label="Breadcrumb">
        <Link href="/campaigns" className="hover:text-foreground">Campaigns</Link> / <span className="text-foreground">{campaign.name}</span>
      </nav>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          {renaming ? (
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                start(async () => {
                  const res = await renameCampaignAction(campaign.id, name);
                  if (!res.ok) return void toast.error(res.error);
                  setRenaming(false);
                  router.refresh();
                });
              }}
            >
              <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={160} aria-label="Campaign name" autoFocus />
              <Button type="submit" size="md" disabled={pending}>Save</Button>
              <Button type="button" variant="ghost" onClick={() => { setName(campaign.name); setRenaming(false); }}>Cancel</Button>
            </form>
          ) : (
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{campaign.name}</h1>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <CampaignStatusBadge status={campaign.status} />
            <SourceBadge source={campaign.generationSource} />
            <span className="text-sm text-muted-foreground">
              {campaign.productSnapshot.name} · {campaign.pins.length} pins
            </span>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary" aria-label="Campaign actions"><MoreHorizontal /> Actions</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onSelect={() => setRenaming(true)}><Pencil /> Rename</DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() =>
                start(async () => {
                  const res = await setCampaignArchivedAction(campaign.id, campaign.status !== "archived");
                  if (!res.ok) return void toast.error(res.error);
                  toast.success(campaign.status === "archived" ? "Campaign restored" : "Campaign archived");
                  router.refresh();
                })
              }
            >
              {campaign.status === "archived" ? <><ArchiveRestore /> Restore</> : <><Archive /> Archive</>}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-danger" onSelect={() => setConfirmDelete(true)}><Trash2 /> Delete campaign</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <ConfirmDialog
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          title="Delete this campaign?"
          description="Its angles, pins and recorded metrics will be permanently deleted. Exported files you've downloaded are not affected."
          pending={pending}
          onConfirm={() =>
            start(async () => {
              const res = await deleteCampaignAction(campaign.id);
              if (!res.ok) return void toast.error(res.error);
              toast.success("Campaign deleted");
              router.push("/campaigns");
            })
          }
        />
      </div>
    </div>
  );
}

export function CampaignWorkspace({ campaign, features, imageCount, regenerationsRemaining, productExists }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [editingId, setEditingId] = useState<string | null>(searchParams.get("pin"));
  const [editorDirty, setEditorDirty] = useState(false);
  const [approving, startApprove] = useTransition();
  const angleNames = new Map(campaign.angles.map((a) => [a.id, a.name]));
  const editing = campaign.pins.find((p) => p.id === editingId) ?? null;
  const drafts = campaign.pins.filter((p) => p.status === "draft").length;

  const closeEditor = useCallback(
    (open: boolean) => {
      if (open) return;
      if (editorDirty && !window.confirm("You have unsaved changes to this pin. Close without saving?")) return;
      setEditorDirty(false);
      setEditingId(null);
    },
    [editorDirty],
  );

  const step = campaign.angles.length === 0 ? 3 : campaign.pins.length === 0 ? 3 : drafts > 0 ? 5 : 6;

  return (
    <>
      <CampaignHeader campaign={campaign} />
      <div className="mb-6">
        <Stepper current={step} />
      </div>
      {campaign.generationSource === "demo" ? (
        <Notice tone="warning" className="mb-6" title="Sample content (demo mode)">
          This campaign was created without a live AI provider. The copy is assembled from your product details as an illustration — review and rewrite it before using it.
        </Notice>
      ) : null}
      {!productExists && campaign.productId === null ? (
        <Notice tone="neutral" className="mb-6">The product for this campaign was deleted. Pins keep the details they were created with.</Notice>
      ) : null}

      {campaign.pins.length === 0 ? (
        <AngleStep campaign={campaign} regenerationsRemaining={regenerationsRemaining} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
          <div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">Review and edit pins</h2>
              <Button
                variant="subtle"
                disabled={drafts === 0 || approving}
                onClick={() =>
                  startApprove(async () => {
                    const res = await approveAllPinsAction(campaign.id);
                    if (!res.ok) return void toast.error(res.error);
                    toast.success(`${res.data.approved} pin${res.data.approved === 1 ? "" : "s"} approved`);
                    router.refresh();
                  })
                }
              >
                {approving ? <Spinner /> : <CheckCheck />} Approve all drafts ({drafts})
              </Button>
            </div>
            <ul className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {campaign.pins.map((pin) => (
                <PinCard
                  key={pin.id}
                  pin={pin}
                  angleName={pin.angleId ? (angleNames.get(pin.angleId) ?? null) : null}
                  onEdit={() => setEditingId(pin.id)}
                  busy={approving}
                  regenerationsRemaining={regenerationsRemaining}
                />
              ))}
            </ul>
          </div>
          <div className="space-y-6">
            <ExportPanel campaign={campaign} zipExport={features.zipExport} />
            <Card>
              <CardHeader><CardTitle>Angles</CardTitle></CardHeader>
              <CardContent>
                <ul className="space-y-3 text-sm">
                  {campaign.angles.filter((a) => a.selected).map((a) => (
                    <li key={a.id}>
                      <p className="font-medium">{a.name}</p>
                      <p className="text-xs text-muted-foreground">{a.message}</p>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      <Dialog open={Boolean(editing)} onOpenChange={closeEditor}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Edit pin</DialogTitle>
            <DialogDescription>Changes are saved to this campaign. Downloads always use the saved version.</DialogDescription>
          </DialogHeader>
          {editing ? (
            <PinEditor
              key={editing.id}
              pin={editing}
              features={features}
              imageCount={imageCount}
              regenerationsRemaining={regenerationsRemaining}
              onDirtyChange={setEditorDirty}
              onSaved={() => router.refresh()}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
