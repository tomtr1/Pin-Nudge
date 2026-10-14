import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/forms";
import { LocalDemoEntry } from "@/components/auth/local-demo";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Notice } from "@/components/ui/misc";
import { getSessionUser } from "@/lib/auth/session";
import { getDataMode } from "@/lib/env";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  if (await getSessionUser()) redirect("/dashboard");
  const mode = getDataMode();
  return (
    <Card>
      <CardHeader>
        <h1 className="text-xl font-semibold tracking-tight">Welcome back</h1>
        <p className="text-sm text-muted-foreground">Log in to continue planning your pins.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? <Notice tone="danger">That sign-in link is invalid or has expired. Please try again.</Notice> : null}
        {mode === "supabase" ? <LoginForm next={next} /> : mode === "local" ? <LocalDemoEntry /> : <SetupRequired />}
        {mode === "supabase" ? (
          <p className="text-center text-sm text-muted-foreground">
            New to PinNudge? <Link href="/signup" className="text-accent hover:underline">Create an account</Link>
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function SetupRequired() {
  return (
    <Notice tone="warning" title="Setup required">
      This deployment has no data store configured. Set the Supabase environment variables described in the README.
    </Notice>
  );
}
