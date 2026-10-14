import type { Metadata } from "next";
import { OnboardingForm } from "@/components/settings/onboarding-form";
import { Card, CardContent } from "@/components/ui/card";
import { requireUserContext } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Set up your account" };

export default async function OnboardingPage() {
  const { repo } = await requireUserContext();
  const profile = await repo.getProfile();
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-tight">Let's set up PinNudge for your shop</h1>
      <p className="mt-1 text-muted-foreground">
        A few details help us suggest better angles and copy. Everything is optional and can be changed later in Settings.
      </p>
      <Card className="mt-6">
        <CardContent className="pt-6">
          <OnboardingForm profile={profile} />
        </CardContent>
      </Card>
    </div>
  );
}
