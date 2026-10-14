import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SignupForm } from "@/components/auth/forms";
import { LocalDemoEntry } from "@/components/auth/local-demo";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Notice } from "@/components/ui/misc";
import { getSessionUser } from "@/lib/auth/session";
import { getDataMode } from "@/lib/env";

export const metadata: Metadata = { title: "Create your account" };

export default async function SignupPage() {
  if (await getSessionUser()) redirect("/dashboard");
  const mode = getDataMode();
  return (
    <Card>
      <CardHeader>
        <h1 className="text-xl font-semibold tracking-tight">Create your account</h1>
        <p className="text-sm text-muted-foreground">Start on the Free plan. You can upgrade later from settings.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {mode === "supabase" ? (
          <SignupForm />
        ) : mode === "local" ? (
          <LocalDemoEntry />
        ) : (
          <Notice tone="warning" title="Setup required">
            This deployment has no data store configured.
          </Notice>
        )}
        {mode === "supabase" ? (
          <p className="text-center text-sm text-muted-foreground">
            Already have an account? <Link href="/login" className="text-accent hover:underline">Log in</Link>
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
