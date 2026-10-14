"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { fail, ok, withUser, type ActionResult } from "@/lib/actions";
import { LOCAL_SESSION_COOKIE } from "@/lib/auth/local-session";
import { getEntitlement } from "@/lib/billing/usage";
import { getStripe } from "@/lib/billing/stripe";
import { getAdminRepository } from "@/lib/data";
import { isStripeConfigured } from "@/lib/env";
import { logger } from "@/lib/logger";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { campaignDefaultsSchema, fieldErrors, profileInputSchema } from "@/lib/validations/schemas";

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
  const result = await withUser("profile.onboarding", async ({ repo }) => {
    const skip = formData.get("intent") === "skip";
    if (skip) {
      await repo.upsertProfile({ onboardingCompleted: true });
      return ok();
    }
    const parsed = profileInputSchema.safeParse(profileFromForm(formData));
    if (!parsed.success) return fail("Please check the highlighted fields.", { code: "validation", fieldErrors: fieldErrors(parsed.error) });
    await repo.upsertProfile({ ...parsed.data, onboardingCompleted: true });
    return ok();
  });
  if (result.ok) redirect("/dashboard?welcome=1");
  return result;
}

export async function updateProfileAction(_prev: unknown, formData: FormData): Promise<ActionResult> {
  return withUser("profile.update", async ({ repo }) => {
    const parsed = profileInputSchema.safeParse(profileFromForm(formData));
    if (!parsed.success) return fail("Please check the highlighted fields.", { code: "validation", fieldErrors: fieldErrors(parsed.error) });
    await repo.upsertProfile(parsed.data);
    revalidatePath("/settings");
    return ok();
  });
}

export async function saveCampaignDefaultsAction(_prev: unknown, formData: FormData): Promise<ActionResult> {
  return withUser("profile.defaults", async ({ repo }) => {
    const entitlement = await getEntitlement(repo);
    if (!entitlement.plan.features.savedPreferences) {
      return fail("Saved campaign preferences are available on the Growth plan and above.", { code: "feature", upgradeTo: "growth" });
    }
    const raw = Object.fromEntries([...formData.entries()].filter(([, v]) => v !== ""));
    const parsed = campaignDefaultsSchema.safeParse(raw);
    if (!parsed.success) return fail("Please check the highlighted fields.", { code: "validation", fieldErrors: fieldErrors(parsed.error) });
    await repo.upsertProfile({ campaignDefaults: parsed.data });
    revalidatePath("/settings");
    return ok();
  });
}

/**
 * Permanently deletes the account: cancels any Stripe subscription, removes
 * uploaded files and deletes every record (cascading from the auth user).
 */
export async function deleteAccountAction(_prev: unknown, formData: FormData): Promise<ActionResult> {
  const result = await withUser("account.delete", async ({ user, repo }) => {
    if (formData.get("confirm") !== "DELETE") return fail("Type DELETE to confirm.", { fieldErrors: { confirm: "Type DELETE to confirm." } });
    const admin = getAdminRepository();
    const sub = await repo.getSubscription();
    if (sub?.stripeSubscriptionId && isStripeConfigured() && !["canceled", "incomplete_expired"].includes(sub.status)) {
      try {
        await getStripe().subscriptions.cancel(sub.stripeSubscriptionId);
      } catch (error) {
        logger.error("account.delete_cancel_failed", { error });
        return fail("We couldn't cancel your subscription with Stripe, so your account was not deleted. Please try again or contact support.");
      }
    }
    await admin.deleteUser(user.id);
    if (user.mode === "supabase") {
      const supabase = await createSupabaseServerClient();
      await supabase.auth.signOut().catch(() => undefined);
    }
    (await cookies()).delete(LOCAL_SESSION_COOKIE);
    return ok();
  });
  if (result.ok) redirect("/?deleted=1");
  return result;
}
