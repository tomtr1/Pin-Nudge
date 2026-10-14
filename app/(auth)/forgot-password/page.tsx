import type { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "@/components/auth/forms";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export const metadata: Metadata = { title: "Reset password" };

export default function ForgotPasswordPage() {
  return (
    <Card>
      <CardHeader>
        <h1 className="font-display text-4xl">Reset your password</h1>
        <p className="text-sm text-muted-foreground">Enter your email and we'll send you a reset link.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <ForgotPasswordForm />
        <p className="text-center text-sm">
          <Link href="/login" className="text-accent hover:underline">Back to log in</Link>
        </p>
      </CardContent>
    </Card>
  );
}
