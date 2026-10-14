"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { updatePasswordAction } from "@/app/actions/auth";
import { deleteAccountAction, saveCampaignDefaultsAction, updateProfileAction } from "@/app/actions/profile";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { Notice, Spinner } from "@/components/ui/misc";
import { TONES } from "@/lib/constants";
import { TEMPLATE_META } from "@/lib/pins/design";
import type { CampaignDefaults, Profile, TemplateId } from "@/types/domain";
import { ProfileFields } from "./profile-fields";

function useToastOnSuccess(state: { ok: boolean } | null, message: string) {
  useEffect(() => {
    if (state?.ok) toast.success(message);
  }, [state, message]);
}

export function ProfileForm({ profile }: { profile: Profile | null }) {
  const [state, action, pending] = useActionState(updateProfileAction, null);
  useToastOnSuccess(state, "Profile saved");
  return (
    <form action={action} className="space-y-6" noValidate>
      {state && !state.ok ? <Notice tone="danger">{state.error}</Notice> : null}
      <ProfileFields profile={profile} errors={state && !state.ok ? state.fieldErrors : undefined} />
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>{pending ? <Spinner /> : null} Save profile</Button>
      </div>
    </form>
  );
}

export function DefaultsForm({ defaults, templates, enabled }: { defaults: CampaignDefaults; templates: TemplateId[]; enabled: boolean }) {
  const [state, action, pending] = useActionState(saveCampaignDefaultsAction, null);
  useToastOnSuccess(state, "Preferences saved");
  const e = (k: string) => (state && !state.ok ? state.fieldErrors?.[k] : undefined);
  return (
    <form action={action} className="space-y-4" noValidate>
      {state && !state.ok ? <Notice tone="danger">{state.error}</Notice> : null}
      <fieldset disabled={!enabled} className="grid gap-4 disabled:opacity-60 sm:grid-cols-2">
        <Field label="Default tone" htmlFor="d-tone" error={e("tone")}>
          <Select id="d-tone" name="tone" defaultValue={defaults.tone ?? ""}>
            <option value="">No default</option>
            {TONES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </Select>
        </Field>
        <Field label="Default number of pins" htmlFor="d-pins" error={e("pinCount")}>
          <Input id="d-pins" name="pinCount" type="number" min={1} max={20} defaultValue={defaults.pinCount ?? ""} />
        </Field>
        <Field label="Default template" htmlFor="d-template" error={e("template")}>
          <Select id="d-template" name="template" defaultValue={defaults.template ?? ""}>
            <option value="">Auto</option>
            {templates.map((t) => <option key={t} value={t}>{TEMPLATE_META[t].name}</option>)}
          </Select>
        </Field>
        <Field label="Default call to action" htmlFor="d-cta" error={e("cta")}>
          <Input id="d-cta" name="cta" maxLength={40} defaultValue={defaults.cta ?? ""} />
        </Field>
        <Field label="Brand background" htmlFor="d-bg" optional error={e("background")}>
          <Input id="d-bg" name="background" type="color" defaultValue={defaults.background ?? "#f4f1ea"} className="h-9 w-20 p-1" />
        </Field>
        <Field label="Brand accent" htmlFor="d-accent" optional error={e("accentColor")}>
          <Input id="d-accent" name="accentColor" type="color" defaultValue={defaults.accentColor ?? "#4f7a5f"} className="h-9 w-20 p-1" />
        </Field>
      </fieldset>
      <div className="flex justify-end">
        <Button type="submit" disabled={pending || !enabled}>{pending ? <Spinner /> : null} Save preferences</Button>
      </div>
    </form>
  );
}

export function PasswordForm() {
  const [state, action, pending] = useActionState(updatePasswordAction, null);
  useToastOnSuccess(state, "Password updated");
  const e = (k: string) => (state && !state.ok ? state.fieldErrors?.[k] : undefined);
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end" noValidate>
      <Field label="New password" htmlFor="new-password" error={e("password")}>
        <Input id="new-password" name="password" type="password" autoComplete="new-password" minLength={8} />
      </Field>
      <Field label="Confirm" htmlFor="confirm-password" error={e("confirm")}>
        <Input id="confirm-password" name="confirm" type="password" autoComplete="new-password" />
      </Field>
      <Button type="submit" variant="secondary" disabled={pending}>{pending ? <Spinner /> : null} Update password</Button>
      {state && !state.ok && !state.fieldErrors ? <Notice tone="danger" className="sm:col-span-3">{state.error}</Notice> : null}
    </form>
  );
}

export function DeleteAccountForm() {
  const [state, action, pending] = useActionState(deleteAccountAction, null);
  const [text, setText] = useState("");
  return (
    <form action={action} className="space-y-3">
      {state && !state.ok ? <Notice tone="danger">{state.error}</Notice> : null}
      <Field label='Type "DELETE" to confirm' htmlFor="confirm-delete">
        <Input id="confirm-delete" name="confirm" value={text} onChange={(e) => setText(e.target.value)} autoComplete="off" className="max-w-xs" />
      </Field>
      <Button type="submit" variant="danger" disabled={pending || text !== "DELETE"}>
        {pending ? <Spinner /> : null} Permanently delete my account
      </Button>
    </form>
  );
}
