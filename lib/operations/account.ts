import "server-only";
import { fail, ok, type ActionResult } from "@/lib/actions";
import { aiStatus } from "@/lib/ai";
import { getAccountUsage, getEntitlement } from "@/lib/billing/usage";
import { getStripe } from "@/lib/billing/stripe";
import { getAdminRepository } from "@/lib/data";
import { getDataMode, isStripeConfigured } from "@/lib/env";
import { logger } from "@/lib/logger";
import { BASIC_FONT_PRESETS } from "@/lib/pins/design";
import { campaignDefaultsSchema, fieldErrors, profileInputSchema } from "@/lib/validations/schemas";
import type { OpCtx } from "./context";

export async function completeOnboarding({ repo }: OpCtx, raw: unknown | null): Promise<ActionResult> {
  if (raw === null) {
    await repo.upsertProfile({ onboardingCompleted: true });
    return ok();
  }
  const parsed = profileInputSchema.safeParse(raw);
  if (!parsed.success) return fail("Please check the highlighted fields.", { code: "validation", fieldErrors: fieldErrors(parsed.error) });
  await repo.upsertProfile({ ...parsed.data, onboardingCompleted: true });
  return ok();
}

export async function updateProfile({ repo }: OpCtx, raw: unknown): Promise<ActionResult> {
  const parsed = profileInputSchema.safeParse(raw);
  if (!parsed.success) return fail("Please check the highlighted fields.", { code: "validation", fieldErrors: fieldErrors(parsed.error) });
  await repo.upsertProfile(parsed.data);
  return ok();
}

export async function saveCampaignDefaults({ repo }: OpCtx, raw: unknown): Promise<ActionResult> {
  const entitlement = await getEntitlement(repo);
  if (!entitlement.plan.features.savedPreferences) {
    return fail("Saved campaign preferences are available on the Growth plan and above.", { code: "feature", upgradeTo: "growth" });
  }
  const parsed = campaignDefaultsSchema.safeParse(raw);
  if (!parsed.success) return fail("Please check the highlighted fields.", { code: "validation", fieldErrors: fieldErrors(parsed.error) });
  await repo.upsertProfile({ campaignDefaults: parsed.data });
  return ok();
}

/**
 * Permanently deletes the account: cancels any Stripe subscription, removes
 * uploaded files and deletes every record (cascading from the auth user).
 * Session/cookie cleanup is the caller's job.
 */
export async function deleteAccount({ user, repo }: OpCtx, confirm: unknown): Promise<ActionResult> {
  if (confirm !== "DELETE") return fail("Type DELETE to confirm.", { code: "validation", fieldErrors: { confirm: "Type DELETE to confirm." } });
  const sub = await repo.getSubscription();
  if (sub?.stripeSubscriptionId && isStripeConfigured() && !["canceled", "incomplete_expired"].includes(sub.status)) {
    try {
      await getStripe().subscriptions.cancel(sub.stripeSubscriptionId);
    } catch (error) {
      logger.error("account.delete_cancel_failed", { error });
      return fail("We couldn't cancel your subscription with Stripe, so your account was not deleted. Please try again or contact support.", { code: "server" });
    }
  }
  await getAdminRepository().deleteUser(user.id);
  return ok();
}

/** Everything a client needs to render account state (used by the mobile app). */
export async function accountSummary({ user, repo }: OpCtx) {
  const [profile, usage] = await Promise.all([repo.getProfile(), getAccountUsage(repo)]);
  const e = usage.entitlement;
  return ok({
    user: { id: user.id, email: user.email },
    profile,
    plan: {
      id: e.planId,
      name: e.plan.name,
      status: e.status,
      isPaid: e.isPaid,
      paymentIssue: e.paymentIssue,
      endsAt: e.endsAt,
      cancelAtPeriodEnd: e.cancelAtPeriodEnd,
      limits: e.plan.limits,
      features: e.plan.features,
      basicFontPresets: BASIC_FONT_PRESETS,
    },
    usage: {
      campaigns: usage.campaigns,
      regenerations: usage.regenerations,
      products: usage.products,
      periodEnd: usage.periodEnd.toISOString(),
    },
    app: { dataMode: getDataMode(), aiMode: aiStatus().mode },
  });
}
