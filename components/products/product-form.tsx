"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { Info } from "lucide-react";
import { toast } from "sonner";
import { createProductAction, updateProductAction } from "@/app/actions/products";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Notice, Spinner } from "@/components/ui/misc";
import type { ActionResult } from "@/lib/actions";
import { PRODUCT_CATEGORIES, VISUAL_STYLES } from "@/lib/constants";
import { ACCEPT_ATTRIBUTE, MAX_IMAGES_PER_PRODUCT } from "@/lib/storage/uploads";
import { isEtsyListingUrl, isEtsyUrl } from "@/lib/validations/url";
import type { Product } from "@/types/domain";

export function ProductForm({ product, onSaved }: { product?: Product; onSaved?: (id: string) => void }) {
  const router = useRouter();
  const action = product ? updateProductAction.bind(null, product.id) : createProductAction;
  const [state, formAction, pending] = useActionState<ActionResult<{ id: string }> | null, FormData>(action, null);
  const [url, setUrl] = useState(product?.destinationUrl ?? "");
  const errors = state && !state.ok ? state.fieldErrors : undefined;
  const e = (k: string) => errors?.[k];

  useEffect(() => {
    if (!state?.ok) return;
    toast.success(product ? "Product saved" : "Product added");
    if (onSaved) onSaved(state.data.id);
    else router.push(`/products/${state.data.id}`);
  }, [state, product, router, onSaved]);

  return (
    <form action={formAction} className="space-y-6" noValidate>
      {state && !state.ok ? <Notice tone="danger">{state.error}</Notice> : null}

      <Field
        label="Etsy listing or destination URL"
        htmlFor="destinationUrl"
        optional
        hint="Where your pins should send people — usually your Etsy listing."
        error={e("destinationUrl")}
      >
        <Input
          id="destinationUrl"
          name="destinationUrl"
          type="url"
          inputMode="url"
          placeholder="https://www.etsy.com/listing/123456789/…"
          value={url}
          onChange={(ev) => setUrl(ev.target.value)}
          aria-invalid={Boolean(e("destinationUrl"))}
        />
      </Field>
      {isEtsyUrl(url) ? (
        <Notice tone="info" icon={<Info />}>
          {isEtsyListingUrl(url) ? "Etsy listing link recognised." : "Etsy link recognised."} PinNudge doesn't import listing details automatically —
          it only uses this link as your pins' destination. Please enter or confirm the product details below and upload your own images.
        </Notice>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Product name" htmlFor="name" error={e("name")} className="sm:col-span-2">
          <Input id="name" name="name" required maxLength={140} defaultValue={product?.name} aria-invalid={Boolean(e("name"))} />
        </Field>
        <Field label="Short description" htmlFor="description" hint="What it is and what's included." error={e("description")} className="sm:col-span-2">
          <Textarea id="description" name="description" rows={3} maxLength={2000} defaultValue={product?.description} />
        </Field>
        <Field label="Category" htmlFor="category" error={e("category")}>
          <Select id="category" name="category" defaultValue={product?.category ?? "other"}>
            {PRODUCT_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </Select>
        </Field>
        <Field label="Visual style" htmlFor="visualStyle" optional error={e("visualStyle")}>
          <Select id="visualStyle" name="visualStyle" defaultValue={product?.visualStyle ?? ""}>
            <option value="">No preference</option>
            {VISUAL_STYLES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </Select>
        </Field>
        <Field label="Target audience" htmlFor="targetAudience" hint="Who buys this?" error={e("targetAudience")}>
          <Input id="targetAudience" name="targetAudience" maxLength={300} defaultValue={product?.targetAudience} placeholder="e.g. new teachers planning their first year" />
        </Field>
        <Field label="Main benefit" htmlFor="mainBenefit" hint="The result it helps people get." error={e("mainBenefit")}>
          <Input id="mainBenefit" name="mainBenefit" maxLength={300} defaultValue={product?.mainBenefit} placeholder="e.g. plan a whole term in one afternoon" />
        </Field>
        <Field label="Keywords" htmlFor="keywords" hint="Comma-separated phrases buyers might search for (max 20)." error={e("keywords")} className="sm:col-span-2">
          <Input id="keywords" name="keywords" defaultValue={product?.keywords.join(", ")} placeholder="budget planner, monthly budget, savings tracker" />
        </Field>
        <Field label="Price" htmlFor="price" optional error={e("price")}>
          <div className="flex gap-2">
            <Input id="price" name="price" inputMode="decimal" defaultValue={product?.price ?? ""} placeholder="4.99" className="flex-1" />
            <Select name="currency" aria-label="Currency" defaultValue={product?.currency ?? "EUR"} className="w-24">
              {["EUR", "USD", "GBP", "CAD", "AUD"].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </Select>
          </div>
        </Field>
        <Field label="Tags" htmlFor="tags" optional hint="For organising your library, e.g. “bestseller, Q4”." error={e("tags")}>
          <Input id="tags" name="tags" defaultValue={product?.tags.join(", ")} />
        </Field>
      </div>

      {!product ? (
        <Field
          label="Product images"
          htmlFor="images"
          optional
          hint={`PNG or JPEG, up to 5 MB each, up to ${MAX_IMAGES_PER_PRODUCT} images. Use your own mockups or screenshots.`}
          error={e("images")}
        >
          <Input id="images" name="images" type="file" accept={ACCEPT_ATTRIBUTE} multiple className="h-auto py-2 file:mr-3 file:rounded file:border-0 file:bg-surface-muted file:px-2 file:py-1 file:text-sm" />
        </Field>
      ) : null}

      <div className="flex justify-end gap-2 border-t border-border pt-5">
        <Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button>
        <Button type="submit" disabled={pending}>
          {pending ? <Spinner /> : null} {product ? "Save changes" : "Add product"}
        </Button>
      </div>
    </form>
  );
}
