import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { brand } from "@/lib/brand";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-[1.5fr_1fr_1fr]">
        <div className="space-y-3">
          <Logo />
          <p className="max-w-sm text-sm text-muted-foreground">{brand.tagline}</p>
          <p className="max-w-sm text-xs text-muted-foreground">{brand.disclaimer}</p>
        </div>
        <div>
          <h2 className="text-sm font-semibold">Product</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><Link className="hover:text-foreground" href="/#how-it-works">How it works</Link></li>
            <li><Link className="hover:text-foreground" href="/pricing">Pricing</Link></li>
            <li><Link className="hover:text-foreground" href="/signup">Create an account</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="text-sm font-semibold">Support &amp; legal</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><Link className="hover:text-foreground" href="/help">Help &amp; contact</Link></li>
            <li><Link className="hover:text-foreground" href="/privacy">Privacy</Link></li>
            <li><Link className="hover:text-foreground" href="/terms">Terms</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border">
        <p className="mx-auto max-w-6xl px-4 py-4 text-xs text-muted-foreground sm:px-6">
          © {new Date().getFullYear()} {brand.name}. Pinterest and Etsy are trademarks of their respective owners.
        </p>
      </div>
    </footer>
  );
}
