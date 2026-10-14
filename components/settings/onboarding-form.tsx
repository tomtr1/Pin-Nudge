"use client";

import { useActionState } from "react";
import { saveOnboardingAction } from "@/app/actions/profile";
import { Button } from "@/components/ui/button";
import { Notice, Spinner } from "@/components/ui/misc";
import type { Profile } from "@/types/domain";
import { ProfileFields } from "./profile-fields";

export function OnboardingForm({ profile }: { profile: Profile | null }) {
  const [state, action, pending] = useActionState(saveOnboardingAction, null);
  const errors = state && !state.ok ? state.fieldErrors : undefined;
  return (
    <form action={action} className="space-y-8" noValidate>
      {state && !state.ok ? <Notice tone="danger">{state.error}</Notice> : null}
      <ProfileFields profile={profile} errors={errors} />
      <div className="flex flex-col-reverse gap-2 border-t border-border pt-6 sm:flex-row sm:justify-between">
        <Button type="submit" name="intent" value="skip" variant="ghost" disabled={pending}>
          Skip for now
        </Button>
        <Button type="submit" name="intent" value="save" size="lg" disabled={pending}>
          {pending ? <Spinner /> : null} Save and continue
        </Button>
      </div>
    </form>
  );
}
