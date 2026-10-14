import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <Logo />
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="max-w-md text-muted-foreground">This page doesn't exist, or it belongs to a different account.</p>
      <Button asChild><Link href="/dashboard">Go to dashboard</Link></Button>
    </main>
  );
}
