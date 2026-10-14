import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { brand } from "@/lib/brand";

export function SiteHeader({ signedIn }: { signedIn: boolean }) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface">
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between gap-4 px-4 sm:px-8">
        <Link href="/" aria-label={`${brand.name} home`}>
          <Logo />
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-8 text-[16px] font-medium md:flex">
          <Link href="/#how-it-works" className="hover:underline hover:underline-offset-4">How it works</Link>
          <Link href="/#features" className="hover:underline hover:underline-offset-4">Features</Link>
          <Link href="/pricing" className="hover:underline hover:underline-offset-4">Pricing</Link>
          <Link href="/help" className="hover:underline hover:underline-offset-4">Help</Link>
        </nav>
        <div className="flex items-center gap-2 sm:gap-4">
          {signedIn ? (
            <Button asChild>
              <Link href="/dashboard">Open dashboard</Link>
            </Button>
          ) : (
            <>
              <Link href="/login" className="text-[15px] font-medium hover:underline hover:underline-offset-4">
                Log in
              </Link>
              <Button asChild className="h-11 px-5">
                <Link href="/signup">Get started</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
