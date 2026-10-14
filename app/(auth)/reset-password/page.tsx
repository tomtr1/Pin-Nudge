import type { Metadata } from "next";
import Link from "next/link";
import { ResetPasswordForm } from "@/components/auth/forms";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Notice } from "@/components/ui/misc";
import { getSessionUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Choose a new password" };

export default async function ResetPasswordPage() {
  const user = await getSessionUser();
  return (
    <Card>
      <CardHeader>
        <h1 className="text-xl font-semibold tracking-tight">Choose a new password</h1>
      </CardHeader>
      <CardContent>
        {user?.mode === "supabase" ? (
          <ResetPasswordForm />
        ) : (
          <Notice tone="warning" title="Link expired">
            Open the reset link from your email again, or <Link className="underline" href="/forgot-password">request a new one</Link>.
          </Notice>
        )}
      </CardContent>
    </Card>
  );
}
