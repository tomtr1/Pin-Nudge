"use client";

import Link from "next/link";
import { useActionState } from "react";
import { CheckCircle2 } from "lucide-react";
import { requestPasswordResetAction, signInAction, signUpAction, updatePasswordAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Notice, Spinner } from "@/components/ui/misc";
import type { ActionResult } from "@/lib/actions";

function ErrorNotice({ state }: { state: ActionResult<unknown> | null }) {
  if (!state || state.ok) return null;
  return <Notice tone="danger">{state.error}</Notice>;
}

const err = (state: ActionResult<unknown> | null, field: string) => (state && !state.ok ? state.fieldErrors?.[field] : undefined);

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(signInAction, null);
  return (
    <form action={action} className="space-y-4" noValidate>
      <ErrorNotice state={state} />
      <input type="hidden" name="next" value={next ?? "/dashboard"} />
      <Field label="Email" htmlFor="email" error={err(state, "email")}>
        <Input id="email" name="email" type="email" autoComplete="email" required aria-invalid={Boolean(err(state, "email"))} />
      </Field>
      <Field label="Password" htmlFor="password" error={err(state, "password")}>
        <Input id="password" name="password" type="password" autoComplete="current-password" required aria-invalid={Boolean(err(state, "password"))} />
      </Field>
      <div className="flex justify-end">
        <Link href="/forgot-password" className="text-sm text-accent hover:underline">Forgot your password?</Link>
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? <Spinner /> : null} Log in
      </Button>
    </form>
  );
}

export function SignupForm() {
  const [state, action, pending] = useActionState(signUpAction, null);
  if (state?.ok && state.data.needsConfirmation) {
    return (
      <Notice tone="accent" icon={<CheckCircle2 />} title="Check your inbox">
        We've sent a confirmation link to your email address. Open it to activate your account, then continue to onboarding.
      </Notice>
    );
  }
  return (
    <form action={action} className="space-y-4" noValidate>
      <ErrorNotice state={state} />
      <Field label="Your name" htmlFor="displayName" optional>
        <Input id="displayName" name="displayName" autoComplete="name" maxLength={80} />
      </Field>
      <Field label="Email" htmlFor="email" error={err(state, "email")}>
        <Input id="email" name="email" type="email" autoComplete="email" required aria-invalid={Boolean(err(state, "email"))} />
      </Field>
      <Field label="Password" htmlFor="password" hint="At least 8 characters." error={err(state, "password")}>
        <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required aria-invalid={Boolean(err(state, "password"))} />
      </Field>
      <div className="space-y-1">
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="terms" className="mt-0.5 size-4 accent-[var(--accent)]" required />
          <span>
            I agree to the <Link href="/terms" className="text-accent underline" target="_blank">terms</Link> and have read the{" "}
            <Link href="/privacy" className="text-accent underline" target="_blank">privacy notice</Link>.
          </span>
        </label>
        {err(state, "terms") ? <p className="text-[13px] text-danger">{err(state, "terms")}</p> : null}
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? <Spinner /> : null} Create account
      </Button>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(requestPasswordResetAction, null);
  if (state?.ok) {
    return (
      <Notice tone="accent" icon={<CheckCircle2 />} title="Check your inbox">
        If an account exists for that address, we've sent a link to reset your password.
      </Notice>
    );
  }
  return (
    <form action={action} className="space-y-4" noValidate>
      <ErrorNotice state={state} />
      <Field label="Email" htmlFor="email" error={err(state, "email")}>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? <Spinner /> : null} Send reset link
      </Button>
    </form>
  );
}

export function ResetPasswordForm() {
  const [state, action, pending] = useActionState(updatePasswordAction, null);
  if (state?.ok) {
    return (
      <div className="space-y-4">
        <Notice tone="accent" icon={<CheckCircle2 />} title="Password updated">
          Your new password is saved.
        </Notice>
        <Button asChild className="w-full">
          <Link href="/dashboard">Go to dashboard</Link>
        </Button>
      </div>
    );
  }
  return (
    <form action={action} className="space-y-4" noValidate>
      <ErrorNotice state={state} />
      <Field label="New password" htmlFor="password" hint="At least 8 characters." error={err(state, "password")}>
        <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
      </Field>
      <Field label="Confirm new password" htmlFor="confirm" error={err(state, "confirm")}>
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required />
      </Field>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? <Spinner /> : null} Update password
      </Button>
    </form>
  );
}
