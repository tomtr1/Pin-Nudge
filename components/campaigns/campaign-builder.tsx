"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { ArrowLeft, ArrowRight, Check, Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { createCampaignAction, generateAnglesAction } from "@/app/actions/campaigns";
import { ProductForm } from "@/components/products/product-form";
import { ProductThumb } from "@/components/products/product-thumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Notice, Spinner } from "@/components/ui/misc";
import { categoryLabel, CTA_SUGGESTIONS, LANGUAGES, OBJECTIVES, TONES, VISUAL_STYLES } from "@/lib/constants";
import { TEMPLATE_META } from "@/lib/pins/design";
import { campaignCreateSchema, fieldErrors } from "@/lib/validations/schemas";
import { displayUrl } from "@/lib/validations/url";
import { cn } from "@/lib/utils";
import type { CampaignDefaults, Product, TemplateId } from "@/types/domain";
import { Stepper } from "./stepper";

interface Props {
  products: Product[];
  initialProductId?: string;
  limits: { pinsPerCampaign: number; anglesPerCampaign: number };
  templates: TemplateId[];
  defaults: CampaignDefaults;
  preferredLanguage: string;
  campaignsRemaining: number;
  aiMode: "live" | "demo";
}

export function CampaignBuilder({ products, initialProductId, limits, templates, defaults, preferredLanguage, campaignsRemaining, aiMode }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(initialProductId && products.some((p) => p.id === initialProductId) ? 2 : 1);
  const [productId, setProductId] = useState(initialProductId && products.some((p) => p.id === initialProductId) ? initialProductId : (products[0]?.id ?? ""));
  const [addingProduct, setAddingProduct] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const [phase, setPhase] = useState<"idle" | "saving" | "generating">("idle");
  const product = products.find((p) => p.id === productId);

  const defaultPins = Math.min(defaults.pinCount ?? 6, limits.pinsPerCampaign);
  const [form, setForm] = useState({
    name: "",
    targetAudience: "",
    objective: "traffic",
    pinCount: defaultPins,
    angleCount: Math.min(3, limits.anglesPerCampaign, defaultPins),
    tone: defaults.tone ?? "friendly",
    visualStyle: "minimal",
    language: preferredLanguage,
    primaryKeyword: "",
    cta: defaults.cta ?? "",
    season: "",
    variety: "balanced",
    template: (defaults.template && templates.includes(defaults.template) ? defaults.template : "auto") as TemplateId | "auto",
  });

  const selectProduct = (id: string) => {
    setProductId(id);
    const p = products.find((x) => x.id === id);
    if (p) {
      setForm((f) => ({
        ...f,
        targetAudience: f.targetAudience || p.targetAudience,
        primaryKeyword: f.primaryKeyword || p.keywords[0] || "",
        visualStyle: p.visualStyle || f.visualStyle,
      }));
    }
  };

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }));

  const pinOptions = useMemo(() => Array.from({ length: limits.pinsPerCampaign }, (_, i) => i + 1), [limits.pinsPerCampaign]);
  const angleOptions = useMemo(
    () => Array.from({ length: Math.min(limits.anglesPerCampaign, form.pinCount) }, (_, i) => i + 1),
    [limits.anglesPerCampaign, form.pinCount],
  );

  function submit() {
    const payload = {
      productId,
      name: form.name,
      targetAudience: form.targetAudience,
      config: {
        objective: form.objective,
        pinCount: form.pinCount,
        angleCount: Math.min(form.angleCount, form.pinCount),
        tone: form.tone,
        visualStyle: form.visualStyle,
        language: form.language,
        primaryKeyword: form.primaryKeyword,
        cta: form.cta,
        season: form.season,
        variety: form.variety,
        template: form.template,
      },
    };
    const parsed = campaignCreateSchema.safeParse(payload);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      toast.error("Please check the campaign settings.");
      return;
    }
    setErrors({});
    start(async () => {
      setPhase("saving");
      const created = await createCampaignAction(parsed.data);
      if (!created.ok) {
        setPhase("idle");
        setErrors(created.fieldErrors ?? {});
        toast.error(created.error);
        return;
      }
      setPhase("generating");
      const generated = await generateAnglesAction(created.data.id);
      if (!generated.ok) {
        // The draft (and all inputs) is saved; the campaign page offers a retry.
        toast.error("Angle generation didn't finish", { description: `${generated.error} Your settings are saved.` });
      }
      router.push(`/campaigns/${created.data.id}`);
    });
  }

  if (products.length === 0) {
    return (
      <Card>
        <CardContent className="space-y-4 pt-6">
          <Stepper current={1} />
          <Notice tone="info" title="Add a product first">Campaigns are built from a product's details. Add one now — it only takes a minute.</Notice>
          <ProductForm onSaved={() => router.refresh()} />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Stepper current={step} />

      {step === 1 ? (
        <Card>
          <CardContent className="space-y-5 pt-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">Which product are you promoting?</h2>
                <p className="text-sm text-muted-foreground">Choose from your library or add a new product.</p>
              </div>
              <Button variant="secondary" onClick={() => setAddingProduct(true)}>
                <Plus /> New product
              </Button>
            </div>
            <div role="radiogroup" aria-label="Product" className="grid gap-3 sm:grid-cols-2">
              {products.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  role="radio"
                  aria-checked={productId === p.id}
                  onClick={() => selectProduct(p.id)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border p-3 text-left transition-colors",
                    productId === p.id ? "border-accent bg-accent-soft/40 ring-1 ring-accent" : "border-border bg-surface hover:bg-surface-muted/60",
                  )}
                >
                  <div className="w-14 shrink-0"><ProductThumb product={p} /></div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{categoryLabel(p.category)}</p>
                  </div>
                  {productId === p.id ? <Check className="size-4 text-accent" aria-hidden /> : null}
                </button>
              ))}
            </div>
            {product ? (
              <div className="rounded-lg border border-border bg-surface-muted/50 p-4 text-sm">
                <p className="font-medium">{product.name}</p>
                <p className="mt-1 line-clamp-3 text-muted-foreground">{product.description || "No description yet — add one for better results."}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Destination: {product.destinationUrl ? displayUrl(product.destinationUrl, 60) : "not set (you can add links per pin later)"}
                </p>
              </div>
            ) : null}
            <div className="flex justify-end">
              <Button onClick={() => setStep(2)} disabled={!productId}>
                Continue <ArrowRight />
              </Button>
            </div>
          </CardContent>
          <Dialog open={addingProduct} onOpenChange={setAddingProduct}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add a product</DialogTitle>
                <DialogDescription>It will be saved to your product library.</DialogDescription>
              </DialogHeader>
              <ProductForm
                onSaved={(id) => {
                  setAddingProduct(false);
                  router.replace(`/campaigns/new?product=${id}`);
                  router.refresh();
                }}
              />
            </DialogContent>
          </Dialog>
        </Card>
      ) : (
        <Card>
          <CardContent className="space-y-6 pt-6">
            <div>
              <h2 className="text-lg font-semibold">Define the campaign</h2>
              <p className="text-sm text-muted-foreground">
                For <span className="font-medium text-foreground">{product?.name}</span>. Sensible defaults are filled in — adjust what matters to you.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Campaign name" htmlFor="name" optional hint="Leave blank to name it after the product." error={errors.name}>
                <Input id="name" value={form.name} maxLength={160} onChange={(e) => set("name", e.target.value)} />
              </Field>
              <Field label="Objective" htmlFor="objective">
                <Select id="objective" value={form.objective} onChange={(e) => set("objective", e.target.value)}>
                  {OBJECTIVES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </Select>
              </Field>
              <Field label="Target audience" htmlFor="targetAudience" hint="Who should these pins speak to?" error={errors.targetAudience} className="sm:col-span-2">
                <Textarea id="targetAudience" rows={2} maxLength={300} value={form.targetAudience} onChange={(e) => set("targetAudience", e.target.value)} />
              </Field>
              <Field label="Number of pins" htmlFor="pinCount" hint={`Up to ${limits.pinsPerCampaign} on your plan.`} error={errors["config.pinCount"]}>
                <Select
                  id="pinCount"
                  value={form.pinCount}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    setForm((f) => ({ ...f, pinCount: n, angleCount: Math.min(f.angleCount, n) }));
                  }}
                >
                  {pinOptions.map((n) => <option key={n} value={n}>{n}</option>)}
                </Select>
              </Field>
              <Field label="Marketing angles" htmlFor="angleCount" hint={`Distinct audiences or messages. Up to ${limits.anglesPerCampaign} on your plan.`} error={errors["config.angleCount"]}>
                <Select id="angleCount" value={form.angleCount} onChange={(e) => set("angleCount", Number(e.target.value))}>
                  {angleOptions.map((n) => <option key={n} value={n}>{n}</option>)}
                </Select>
              </Field>
              <Field label="Variety of angles" htmlFor="variety">
                <Select id="variety" value={form.variety} onChange={(e) => set("variety", e.target.value)}>
                  <option value="focused">Focused — stay close to my audience</option>
                  <option value="balanced">Balanced</option>
                  <option value="broad">Broad — explore new audiences</option>
                </Select>
              </Field>
              <Field label="Tone of voice" htmlFor="tone">
                <Select id="tone" value={form.tone} onChange={(e) => set("tone", e.target.value)}>
                  {TONES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </Select>
              </Field>
              <Field label="Visual style" htmlFor="visualStyle">
                <Select id="visualStyle" value={form.visualStyle} onChange={(e) => set("visualStyle", e.target.value)}>
                  {VISUAL_STYLES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </Select>
              </Field>
              <Field label="Language" htmlFor="language" hint={aiMode === "demo" ? "Demo mode sample content is written in English." : undefined}>
                <Select id="language" value={form.language} onChange={(e) => set("language", e.target.value)}>
                  {LANGUAGES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
                </Select>
              </Field>
              <Field label="Primary keyword or theme" htmlFor="primaryKeyword" optional error={errors["config.primaryKeyword"]}>
                <Input id="primaryKeyword" value={form.primaryKeyword} maxLength={80} onChange={(e) => set("primaryKeyword", e.target.value)} />
              </Field>
              <Field label="Call to action" htmlFor="cta" optional error={errors["config.cta"]}>
                <Input id="cta" list="cta-suggestions" value={form.cta} maxLength={40} onChange={(e) => set("cta", e.target.value)} placeholder="e.g. Get the template" />
                <datalist id="cta-suggestions">{CTA_SUGGESTIONS.map((c) => <option key={c} value={c} />)}</datalist>
              </Field>
              <Field label="Seasonal context" htmlFor="season" optional hint="e.g. back to school, New Year, wedding season.">
                <Input id="season" value={form.season} maxLength={80} onChange={(e) => set("season", e.target.value)} />
              </Field>
              <Field label="Template" htmlFor="template" hint="Auto lets each pin use the best-fitting layout.">
                <Select id="template" value={form.template} onChange={(e) => set("template", e.target.value as TemplateId | "auto")}>
                  <option value="auto">Auto (mix of templates)</option>
                  {templates.map((t) => <option key={t} value={t}>{TEMPLATE_META[t].name}</option>)}
                </Select>
              </Field>
            </div>

            {campaignsRemaining <= 0 ? (
              <Notice tone="warning" title="Monthly campaign limit reached">
                You've used all campaign generations for this month. Upgrade in Settings or wait until the limit resets.
              </Notice>
            ) : (
              <p className="text-xs text-muted-foreground">
                Generating angles uses 1 of your {campaignsRemaining} remaining campaign generation{campaignsRemaining === 1 ? "" : "s"} this month.
                {aiMode === "demo" ? " In demo mode the results are labelled sample content." : ""}
              </p>
            )}

            <div className="flex flex-col-reverse gap-2 border-t border-border pt-5 sm:flex-row sm:justify-between">
              <Button variant="ghost" onClick={() => setStep(1)} disabled={pending}>
                <ArrowLeft /> Back
              </Button>
              <Button onClick={submit} disabled={pending || campaignsRemaining <= 0} size="lg">
                {pending ? <Spinner /> : <Sparkles />}
                {phase === "saving" ? "Saving settings…" : phase === "generating" ? "Generating angles…" : "Generate marketing angles"}
              </Button>
            </div>
            {phase === "generating" ? (
              <p className="text-right text-xs text-muted-foreground" role="status" aria-live="polite">
                This can take up to a minute. Your settings are already saved.
              </p>
            ) : null}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
