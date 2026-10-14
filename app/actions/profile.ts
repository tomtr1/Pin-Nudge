"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { withUser, type ActionResult } from "@/lib/actions";
import { LOCAL_SESSION_COOKIE } from "@/lib/auth/local-session";
import * as account from "@/lib/operations/account";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function profileFromForm(formData: FormData) {
  return {
    displayName: formData.get("displayName"),
    storeName: formData.get("storeName"),
    etsyShopUrl: formData.get("etsyShopUrl"),
    pinterestProfileUrl: formData.get("pinterestProfileUrl"),
    productTypes: formData.getAll("productTypes").map(String),
    visualStyle: formData.get("visualStyle") ?? "",
    targetAudience: formData.get("targetAudience"),
    marketingGoals: formData.getAll("marketingGoals").map(String),
    preferredLanguage: formData.get("preferredLanguage") || "en",
    destinationBehavior: formData.get("destinationBehavior") || "product_url",
  };
}

export async function saveOnboardingAction(_prev: unknown, formData: FormData): Promise<ActionResult> {
  const result = await withUser("profile.onboarding", (ctx) =>
    account.completeOnboarding(ctx, formData.get("intent") === "skip" ? null : profileFromForm(formData)),
  );
  if (result.ok) redirect("/dashboard?welcome=1");
  return result;
}

export async function updateProfileAction(_prev: unknown, formData: FormData): Promise<ActionResult> {
  return withUser("profile.update", async (ctx) => {
    const result = await account.updateProfile(ctx, profileFromForm(formData));
    if (result.ok) revalidatePath("/settings");
    return result;
  });
}

export async function saveCampaignDefaultsAction(_prev: unknown, formData: FormData): Promise<ActionResult> {
  return withUser("profile.defaults", async (ctx) => {
    const raw = Object.fromEntries([...formData.entries()].filter(([, v]) => v !== ""));
    const result = await account.saveCampaignDefaults(ctx, raw);
    if (result.ok) revalidatePath("/settings");
    return result;
  });
}

/** Permanently deletes the account, then clears the web session. */
export async function deleteAccountAction(_prev: unknown, formData: FormData): Promise<ActionResult> {
  const result = await withUser("account.delete", async (ctx) => {
    const deleted = await account.deleteAccount(ctx, formData.get("confirm"));
    if (!deleted.ok) return deleted;
    if (ctx.user.mode === "supabase") {
      const supabase = await createSupabaseServerClient();
      await supabase.auth.signOut().catch(() => undefined);
    }
    (await cookies()).delete(LOCAL_SESSION_COOKIE);
    return deleted;
  });
  if (result.ok) redirect("/?deleted=1");
  return result;
}
