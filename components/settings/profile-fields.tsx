import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { LANGUAGES, MARKETING_GOALS, PRODUCT_CATEGORIES, VISUAL_STYLES } from "@/lib/constants";
import type { Profile } from "@/types/domain";

type Errors = Record<string, string> | undefined;

function CheckboxGroup({ name, legend, options, selected, hint }: { name: string; legend: string; options: readonly { value: string; label: string }[]; selected: string[]; hint?: string }) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">{legend}</legend>
      {hint ? <p className="text-[13px] text-muted-foreground">{hint}</p> : null}
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((o) => (
          <label key={o.value} className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm has-[:checked]:border-accent has-[:checked]:bg-accent-soft/50">
            <input type="checkbox" name={name} value={o.value} defaultChecked={selected.includes(o.value)} className="size-4 accent-[var(--accent)]" />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function ProfileFields({ profile, errors, sections = "all" }: { profile: Profile | null; errors: Errors; sections?: "all" | "store" }) {
  const e = (k: string) => errors?.[k];
  return (
    <div className="space-y-6">
      <CheckboxGroup
        name="productTypes"
        legend="What kinds of digital products do you sell?"
        options={PRODUCT_CATEGORIES}
        selected={profile?.productTypes ?? []}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Your name" htmlFor="displayName" optional error={e("displayName")}>
          <Input id="displayName" name="displayName" defaultValue={profile?.displayName ?? ""} maxLength={80} />
        </Field>
        <Field label="Store name" htmlFor="storeName" optional hint="Can be shown on your pins." error={e("storeName")}>
          <Input id="storeName" name="storeName" defaultValue={profile?.storeName ?? ""} maxLength={120} />
        </Field>
        <Field label="Etsy shop URL" htmlFor="etsyShopUrl" optional error={e("etsyShopUrl")}>
          <Input id="etsyShopUrl" name="etsyShopUrl" type="url" inputMode="url" placeholder="https://www.etsy.com/shop/YourShop" defaultValue={profile?.etsyShopUrl ?? ""} aria-invalid={Boolean(e("etsyShopUrl"))} />
        </Field>
        <Field
          label="Pinterest profile URL"
          htmlFor="pinterestProfileUrl"
          optional
          hint="Saved as a reference only. PinNudge doesn't connect to your Pinterest account or read its analytics."
          error={e("pinterestProfileUrl")}
        >
          <Input id="pinterestProfileUrl" name="pinterestProfileUrl" type="url" inputMode="url" placeholder="https://www.pinterest.com/yourprofile" defaultValue={profile?.pinterestProfileUrl ?? ""} aria-invalid={Boolean(e("pinterestProfileUrl"))} />
        </Field>
      </div>
      {sections === "all" ? (
        <>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Preferred visual style</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {VISUAL_STYLES.map((s) => (
                <label key={s.value} className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm has-[:checked]:border-accent has-[:checked]:bg-accent-soft/50">
                  <input type="radio" name="visualStyle" value={s.value} defaultChecked={profile?.visualStyle === s.value} className="size-4 accent-[var(--accent)]" />
                  {s.label}
                </label>
              ))}
            </div>
          </fieldset>
          <Field label="Who are your customers?" htmlFor="targetAudience" optional hint="For example: “busy parents who want to get organised” or “new teachers”." error={e("targetAudience")}>
            <Textarea id="targetAudience" name="targetAudience" rows={2} maxLength={300} defaultValue={profile?.targetAudience ?? ""} />
          </Field>
          <CheckboxGroup name="marketingGoals" legend="Main marketing goals" options={MARKETING_GOALS} selected={profile?.marketingGoals ?? []} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Preferred language for pin copy" htmlFor="preferredLanguage">
              <Select id="preferredLanguage" name="preferredLanguage" defaultValue={profile?.preferredLanguage ?? "en"}>
                {LANGUAGES.map((l) => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </Select>
            </Field>
            <Field label="Default pin destination" htmlFor="destinationBehavior" hint="Where new pins should link by default. You can change any pin's link.">
              <Select id="destinationBehavior" name="destinationBehavior" defaultValue={profile?.destinationBehavior ?? "product_url"}>
                <option value="product_url">The product's listing URL</option>
                <option value="shop_url">My Etsy shop URL</option>
                <option value="ask">Decide per campaign</option>
              </Select>
            </Field>
          </div>
        </>
      ) : null}
    </div>
  );
}
