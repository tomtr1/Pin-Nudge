import "server-only";
import { aiStatus } from "@/lib/ai";
import { getDataMode, isStripeConfigured } from "@/lib/env";

/** Which integrations are live on this deployment, for honest UI labelling. */
export function getAppStatus() {
  return {
    dataMode: getDataMode(),
    ai: aiStatus(),
    billingLive: isStripeConfigured(),
  };
}
