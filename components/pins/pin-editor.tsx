"use client";

/* eslint-disable @next/next/no-img-element -- preview images are blob URLs from our renderer */
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { AlertTriangle, Download, RefreshCw, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { regeneratePinAction, savePinAction } from "@/app/actions/pins";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Notice, Spinner } from "@/components/ui/misc";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BASIC_FONT_PRESETS, COLOR_PRESETS, contrastRatio, TEMPLATE_META } from "@/lib/pins/design";
import { cn } from "@/lib/utils";
import { FONT_PRESETS, IMAGE_PLACEMENTS, type FontPreset, type ImagePlacement, type Pin, type PinDesign, type PlanId, type TemplateId } from "@/types/domain";
import { UpgradeHint } from "@/components/campaigns/upgrade-hint";

export interface EditorFeatures {
  templates: TemplateId[];
  customColors: boolean;
  allFontPresets: boolean;
}

type FormState = {
  title: string;
  description: string;
  primaryKeyword: string;
  keywords: string;
  creativeConcept: string;
  headline: string;
  subheadline: string;
  bullets: string;
  cta: string;
  destinationUrl: string;
  altText: string;
  filename: string;
  design: PinDesign;
};

function fromPin(p: Pin): FormState {
  return {
    title: p.title,
    description: p.description,
    primaryKeyword: p.primaryKeyword,
    keywords: p.keywords.join(", "),
    creativeConcept: p.creativeConcept,
    headline: p.headline,
    subheadline: p.subheadline,
    bullets: p.bullets.join("\n"),
    cta: p.cta,
    destinationUrl: p.destinationUrl ?? "",
    altText: p.altText,
    filename: p.filename,
    design: p.design,
  };
}

const FONT_LABELS: Record<FontPreset, string> = { editorial: "Editorial serif", modern: "Clean sans", classic: "Classic serif", bold: "Bold display" };
const PLACEMENT_LABELS: Record<ImagePlacement, string> = { auto: "Template default", top: "Top", middle: "Middle", bottom: "Bottom", none: "No image" };

function Counter({ value, max }: { value: string; max: number }) {
  return (
    <span className={cn("tabular-nums", value.length > max ? "text-danger" : "text-muted-foreground")}>
      {value.length}/{max}
    </span>
  );
}

export function PinEditor({
  pin,
  features,
  imageCount,
  regenerationsRemaining,
  onSaved,
  onDirtyChange,
}: {
  pin: Pin;
  features: EditorFeatures;
  imageCount: number;
  regenerationsRemaining: number;
  onSaved: (pin: Pin) => void;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const [form, setForm] = useState<FormState>(() => fromPin(pin));
  const [baseline, setBaseline] = useState<FormState>(() => fromPin(pin));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [overwrite, setOverwrite] = useState(false);
  const [saving, startSave] = useTransition();
  const [regenerating, startRegen] = useTransition();
  const [regenError, setRegenError] = useState<{ message: string; upgradeTo?: PlanId | null } | null>(null);
  const [preview, setPreview] = useState<{ url: string | null; key: string | null; errorKey: string | null }>({ url: null, key: null, errorKey: null });
  const lastUrl = useRef<string | null>(null);

  const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(baseline), [form, baseline]);
  useEffect(() => onDirtyChange?.(dirty), [dirty, onDirtyChange]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));
  const setDesign = <K extends keyof PinDesign>(k: K, v: PinDesign[K]) => setForm((f) => ({ ...f, design: { ...f.design, [k]: v } }));

  const previewPayload = useMemo(
    () =>
      JSON.stringify({
        headline: form.headline.slice(0, 90),
        subheadline: form.subheadline.slice(0, 140),
        bullets: form.bullets.split("\n").map((b) => b.trim().slice(0, 60)).filter(Boolean).slice(0, 5),
        cta: form.cta.slice(0, 40),
        design: form.design,
      }),
    [form.headline, form.subheadline, form.bullets, form.cta, form.design],
  );

  // Debounced live preview from the same renderer used for exports.
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/pins/${pin.id}/preview`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: previewPayload,
          signal: controller.signal,
        });
        if (!res.ok) throw new Error("preview failed");
        const url = URL.createObjectURL(await res.blob());
        if (lastUrl.current) URL.revokeObjectURL(lastUrl.current);
        lastUrl.current = url;
        setPreview({ url, key: previewPayload, errorKey: null });
      } catch (e) {
        if ((e as Error).name !== "AbortError") setPreview((p) => ({ ...p, errorKey: previewPayload }));
      }
    }, 350);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [pin.id, previewPayload]);

  useEffect(() => () => {
    if (lastUrl.current) URL.revokeObjectURL(lastUrl.current);
  }, []);

  function save() {
    setErrors({});
    startSave(async () => {
      const res = await savePinAction(pin.id, {
        ...form,
        keywords: form.keywords,
        bullets: form.bullets,
        destinationUrl: form.destinationUrl || null,
      });
      if (!res.ok) {
        setErrors(res.fieldErrors ?? {});
        toast.error(res.error);
        return;
      }
      const next = fromPin(res.data);
      setForm(next);
      setBaseline(next);
      toast.success("Pin saved");
      onSaved(res.data);
    });
  }

  function regenerate(mode: "copy" | "creative") {
    setRegenError(null);
    startRegen(async () => {
      const res = await regeneratePinAction(pin.id, mode, overwrite);
      if (!res.ok) {
        setRegenError({ message: res.error, upgradeTo: res.upgradeTo });
        return;
      }
      const next = fromPin(res.data.pin);
      setForm(next);
      setBaseline(next);
      onSaved(res.data.pin);
      toast.success(mode === "copy" ? "New copy written" : "New creative concept ready", {
        description: res.data.keptFields.length ? `Kept your edits to: ${res.data.keptFields.join(", ")}.` : undefined,
      });
    });
  }

  const previewError = preview.errorKey === previewPayload;
  const previewLoading = preview.key !== previewPayload && !previewError;
  const contrast = contrastRatio(form.design.background, form.design.textColor);

  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,300px)_1fr]">
      <div className="space-y-3">
        <div className="relative overflow-hidden rounded-lg border border-border bg-surface-muted">
          {preview.url ? (
            <img src={preview.url} alt={form.altText || "Pin preview"} className="aspect-[2/3] w-full" />
          ) : (
            <div className="aspect-[2/3] w-full" />
          )}
          {previewLoading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-surface/40" aria-live="polite">
              <Spinner className="size-6 text-accent" />
              <span className="sr-only">Updating preview</span>
            </div>
          ) : null}
          {previewError ? (
            <div className="absolute inset-x-2 bottom-2">
              <Notice tone="danger">Preview couldn't be rendered. Check your connection and try again.</Notice>
            </div>
          ) : null}
        </div>
        <p className="text-center text-xs text-muted-foreground">Preview at half size. Exports are 1000 × 1500 px.</p>
        <Button asChild variant="secondary" size="sm" className="w-full">
          <a href={`/api/pins/${pin.id}/image?download=1&v=${encodeURIComponent(pin.updatedAt)}`} download>
            <Download /> Download saved PNG
          </a>
        </Button>
        {dirty ? <p className="text-center text-xs text-warning">Save to include your latest changes in downloads.</p> : null}

        <div className="space-y-2 rounded-lg border border-border p-3">
          <p className="text-sm font-medium">Regenerate this pin</p>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" size="sm" disabled={regenerating || dirty || regenerationsRemaining <= 0} onClick={() => regenerate("copy")}>
              {regenerating ? <Spinner /> : <RefreshCw />} Copy
            </Button>
            <Button variant="secondary" size="sm" disabled={regenerating || dirty || regenerationsRemaining <= 0} onClick={() => regenerate("creative")}>
              {regenerating ? <Spinner /> : <Wand2 />} Creative
            </Button>
          </div>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input type="checkbox" className="size-3.5 accent-[var(--accent)]" checked={overwrite} onChange={(e) => setOverwrite(e.target.checked)} />
            Overwrite fields I edited by hand
          </label>
          <p className="text-xs text-muted-foreground">
            {dirty ? "Save or undo your changes before regenerating. " : ""}
            {regenerationsRemaining} regeneration{regenerationsRemaining === 1 ? "" : "s"} left this month.
          </p>
          {pin.editedFields.length && !overwrite ? (
            <p className="text-xs text-muted-foreground">Kept on regenerate: {pin.editedFields.join(", ")}.</p>
          ) : null}
          {regenError ? (
            <Notice tone="danger">
              {regenError.message} {regenError.upgradeTo ? <UpgradeHint plan={regenError.upgradeTo} /> : null}
            </Notice>
          ) : null}
        </div>
      </div>

      <div className="min-w-0">
        <Tabs defaultValue="copy">
          <TabsList>
            <TabsTrigger value="copy">Pin copy</TabsTrigger>
            <TabsTrigger value="overlay">Image text</TabsTrigger>
            <TabsTrigger value="design">Design</TabsTrigger>
          </TabsList>

          <TabsContent value="copy" className="space-y-4">
            <Field label="Title" htmlFor="pin-title" hint={<Counter value={form.title} max={100} />} error={errors.title}>
              <Input id="pin-title" value={form.title} onChange={(e) => set("title", e.target.value)} aria-invalid={Boolean(errors.title)} />
            </Field>
            <Field label="Description" htmlFor="pin-description" hint={<Counter value={form.description} max={500} />} error={errors.description}>
              <Textarea id="pin-description" rows={5} value={form.description} onChange={(e) => set("description", e.target.value)} aria-invalid={Boolean(errors.description)} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Primary keyword" htmlFor="pin-pk" error={errors.primaryKeyword}>
                <Input id="pin-pk" value={form.primaryKeyword} maxLength={80} onChange={(e) => set("primaryKeyword", e.target.value)} />
              </Field>
              <Field label="Call to action" htmlFor="pin-cta" hint={<Counter value={form.cta} max={40} />} error={errors.cta}>
                <Input id="pin-cta" value={form.cta} onChange={(e) => set("cta", e.target.value)} />
              </Field>
            </div>
            <Field label="Supporting keywords" htmlFor="pin-kw" hint="Comma-separated ideas — not measured search volumes." error={errors.keywords}>
              <Input id="pin-kw" value={form.keywords} onChange={(e) => set("keywords", e.target.value)} />
            </Field>
            <Field label="Destination URL" htmlFor="pin-url" error={errors.destinationUrl}>
              <Input id="pin-url" type="url" inputMode="url" value={form.destinationUrl} onChange={(e) => set("destinationUrl", e.target.value)} placeholder="https://www.etsy.com/listing/…" aria-invalid={Boolean(errors.destinationUrl)} />
            </Field>
            <Field label="Alt text" htmlFor="pin-alt" hint="Describes the image for people using screen readers." error={errors.altText}>
              <Textarea id="pin-alt" rows={2} maxLength={500} value={form.altText} onChange={(e) => set("altText", e.target.value)} />
            </Field>
            <Field label="Export filename" htmlFor="pin-file" hint="Used for downloads. Letters, numbers and hyphens work best." error={errors.filename}>
              <Input id="pin-file" value={form.filename} maxLength={120} onChange={(e) => set("filename", e.target.value)} />
            </Field>
          </TabsContent>

          <TabsContent value="overlay" className="space-y-4">
            <Field label="Creative concept" htmlFor="pin-concept" hint="The visual idea behind this pin (not shown on the image)." error={errors.creativeConcept}>
              <Textarea id="pin-concept" rows={2} maxLength={500} value={form.creativeConcept} onChange={(e) => set("creativeConcept", e.target.value)} />
            </Field>
            <Field label="Headline" htmlFor="pin-headline" hint={<Counter value={form.headline} max={90} />} error={errors.headline}>
              <Input id="pin-headline" value={form.headline} onChange={(e) => set("headline", e.target.value)} />
            </Field>
            <Field label="Subheading" htmlFor="pin-sub" hint={<Counter value={form.subheadline} max={140} />} error={errors.subheadline}>
              <Textarea id="pin-sub" rows={2} value={form.subheadline} onChange={(e) => set("subheadline", e.target.value)} />
            </Field>
            <Field
              label="List points"
              htmlFor="pin-bullets"
              hint={TEMPLATE_META[form.design.template].usesBullets ? "One per line, up to 4 short points." : "Only shown on the Benefits and Checklist templates."}
              error={errors.bullets}
            >
              <Textarea id="pin-bullets" rows={4} value={form.bullets} onChange={(e) => set("bullets", e.target.value)} />
            </Field>
          </TabsContent>

          <TabsContent value="design" className="space-y-5">
            <Field label="Template" htmlFor="pin-template">
              <Select id="pin-template" value={form.design.template} onChange={(e) => setDesign("template", e.target.value as TemplateId)}>
                {features.templates.map((t) => (
                  <option key={t} value={t}>{TEMPLATE_META[t].name}</option>
                ))}
                {!features.templates.includes(form.design.template) ? (
                  <option value={form.design.template} disabled>
                    {TEMPLATE_META[form.design.template].name} (not on your plan)
                  </option>
                ) : null}
              </Select>
            </Field>
            <fieldset>
              <legend className="text-sm font-medium">Colour palette</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {COLOR_PRESETS.map((c) => {
                  const active = c.background === form.design.background && c.textColor === form.design.textColor && c.accentColor === form.design.accentColor;
                  return (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, design: { ...f.design, background: c.background, textColor: c.textColor, accentColor: c.accentColor } }))}
                      className={cn("flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs", active ? "border-accent ring-1 ring-accent" : "border-border")}
                      aria-pressed={active}
                    >
                      <span className="flex">
                        <span className="size-3.5 rounded-full border border-black/10" style={{ background: c.background }} />
                        <span className="-ml-1 size-3.5 rounded-full border border-black/10" style={{ background: c.accentColor }} />
                      </span>
                      {c.name}
                    </button>
                  );
                })}
              </div>
            </fieldset>
            {features.customColors ? (
              <div className="grid grid-cols-3 gap-3">
                {(["background", "textColor", "accentColor"] as const).map((k) => (
                  <Field key={k} label={k === "background" ? "Background" : k === "textColor" ? "Text" : "Accent"} htmlFor={`pin-${k}`}>
                    <div className="flex items-center gap-2">
                      <input id={`pin-${k}`} type="color" value={form.design[k]} onChange={(e) => setDesign(k, e.target.value)} className="h-9 w-12 cursor-pointer rounded border border-border-strong bg-surface p-0.5" />
                      <span className="text-xs tabular-nums text-muted-foreground">{form.design[k]}</span>
                    </div>
                  </Field>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Custom colours are available on Starter and above.</p>
            )}
            {contrast < 4.5 ? (
              <Notice tone="warning" icon={<AlertTriangle />}>
                Low contrast between text and background ({contrast.toFixed(1)}:1). The renderer will switch to a more readable text colour.
              </Notice>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Typography" htmlFor="pin-font" hint={!features.allFontPresets ? "More presets on Growth and Pro." : undefined}>
                <Select id="pin-font" value={form.design.fontPreset} onChange={(e) => setDesign("fontPreset", e.target.value as FontPreset)}>
                  {FONT_PRESETS.map((f) => (
                    <option key={f} value={f} disabled={!features.allFontPresets && !BASIC_FONT_PRESETS.includes(f) && f !== pin.design.fontPreset}>{FONT_LABELS[f]}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Product image placement" htmlFor="pin-placement" hint={imageCount === 0 ? "This product has no images yet." : undefined}>
                <Select id="pin-placement" value={form.design.imagePlacement} onChange={(e) => setDesign("imagePlacement", e.target.value as ImagePlacement)} disabled={imageCount === 0}>
                  {IMAGE_PLACEMENTS.map((p) => (
                    <option key={p} value={p}>{PLACEMENT_LABELS[p]}</option>
                  ))}
                </Select>
              </Field>
              {imageCount > 1 ? (
                <Field label="Which image" htmlFor="pin-image">
                  <Select id="pin-image" value={form.design.imageIndex} onChange={(e) => setDesign("imageIndex", Number(e.target.value))}>
                    {Array.from({ length: imageCount }, (_, i) => (
                      <option key={i} value={i}>Image {i + 1}</option>
                    ))}
                  </Select>
                </Field>
              ) : null}
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="size-4 accent-[var(--accent)]" checked={form.design.showStoreName} onChange={(e) => setDesign("showStoreName", e.target.checked)} />
              Show my store name on the pin
            </label>
          </TabsContent>
        </Tabs>

        <div className="mt-6 flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
          <Button variant="ghost" disabled={!dirty || saving} onClick={() => setForm(baseline)}>
            Undo changes
          </Button>
          <Button onClick={save} disabled={!dirty || saving}>
            {saving ? <Spinner /> : null} Save pin
          </Button>
        </div>
      </div>
    </div>
  );
}
