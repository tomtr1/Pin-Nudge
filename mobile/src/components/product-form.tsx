import { useState } from "react";
import { View } from "react-native";
import { Choice, Field } from "./ui";
import { PRODUCT_CATEGORIES } from "../shared/constants";
import type { Product } from "../shared/domain";

export interface ProductDraft {
  name: string;
  category: string;
  mainBenefit: string;
  targetAudience: string;
  description: string;
  keywords: string;
  destinationUrl: string;
}

export function draftFrom(p?: Product | null): ProductDraft {
  return {
    name: p?.name ?? "",
    category: p?.category ?? "planner",
    mainBenefit: p?.mainBenefit ?? "",
    targetAudience: p?.targetAudience ?? "",
    description: p?.description ?? "",
    keywords: p?.keywords.join(", ") ?? "",
    destinationUrl: p?.destinationUrl ?? "",
  };
}

/** JSON body accepted by the products API (same schema as the website form). */
export function draftToBody(d: ProductDraft, original?: Product | null) {
  return {
    name: d.name.trim(),
    category: d.category,
    mainBenefit: d.mainBenefit.trim(),
    targetAudience: d.targetAudience.trim(),
    description: d.description.trim(),
    keywords: d.keywords,
    destinationUrl: d.destinationUrl.trim(),
    visualStyle: original?.visualStyle ?? "",
    price: original?.price ?? null,
    currency: original?.currency ?? null,
    tags: original?.tags ?? [],
  };
}

const CATEGORY_OPTIONS = PRODUCT_CATEGORIES.map((c) => ({ value: c.value as string, label: c.label }));

export function ProductForm({ draft, onChange, errors }: { draft: ProductDraft; onChange: (d: ProductDraft) => void; errors: Record<string, string> }) {
  const set = (k: keyof ProductDraft) => (v: string) => onChange({ ...draft, [k]: v });
  const [showMore, setShowMore] = useState(Boolean(draft.description || draft.destinationUrl));
  return (
    <View style={{ gap: 16 }}>
      <Field label="Product name" value={draft.name} onChangeText={set("name")} placeholder="Minimalist weekly planner" maxLength={140} error={errors.name} />
      <Choice label="Type of product" options={CATEGORY_OPTIONS} value={draft.category} onChange={set("category")} />
      <Field label="Main benefit" value={draft.mainBenefit} onChangeText={set("mainBenefit")} placeholder="Plan the whole family week in ten minutes" multiline counter={{ value: draft.mainBenefit, max: 300 }} error={errors.mainBenefit} />
      <Field label="Who it's for" value={draft.targetAudience} onChangeText={set("targetAudience")} placeholder="Busy parents who like paper planning" error={errors.targetAudience} />
      <Field label="Keywords" value={draft.keywords} onChangeText={set("keywords")} placeholder="weekly planner, family organiser" hint="Comma-separated. Words your buyers search for." autoCapitalize="none" error={errors.keywords} />
      {showMore ? (
        <>
          <Field label="Short description" value={draft.description} onChangeText={set("description")} multiline counter={{ value: draft.description, max: 2000 }} error={errors.description} />
          <Field label="Etsy listing URL" value={draft.destinationUrl} onChangeText={set("destinationUrl")} placeholder="https://www.etsy.com/listing/…" autoCapitalize="none" keyboardType="url" error={errors.destinationUrl} hint="Pins link here. Optional." />
        </>
      ) : (
        <Choice options={[{ value: "more", label: "+ Description and listing link" }]} value={"" as string} onChange={() => setShowMore(true)} />
      )}
    </View>
  );
}
