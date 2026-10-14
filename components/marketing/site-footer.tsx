import Link from "next/link";
import { brand } from "@/lib/brand";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-8 md:grid-cols-[1.6fr_1fr_1fr]">
        <div className="space-y-4">
          <p className="font-display text-4xl">{brand.name}</p>
          <p className="max-w-sm text-[15px] text-muted-foreground">{brand.tagline}</p>
          <p className="max-w-sm text-xs text-muted-foreground">{brand.disclaimer}</p>
        </div>
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Product</h2>
          <ul className="mt-4 space-y-2.5 text-[15px]">
            <li><Link className="hover:underline hover:underline-offset-4" href="/#how-it-works">How it works</Link></li>
            <li><Link className="hover:underline hover:underline-offset-4" href="/pricing">Pricing</Link></li>
            <li><Link className="hover:underline hover:underline-offset-4" href="/signup">Create an account</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Support &amp; legal</h2>
          <ul className="mt-4 space-y-2.5 text-[15px]">
            <li><Link className="hover:underline hover:underline-offset-4" href="/help">Help &amp; contact</Link></li>
            <li><Link className="hover:underline hover:underline-offset-4" href="/privacy">Privacy</Link></li>
            <li><Link className="hover:underline hover:underline-offset-4" href="/terms">Terms</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border">
        <p className="mx-auto max-w-7xl px-4 py-5 text-xs text-muted-foreground sm:px-8">
          © {new Date().getFullYear()} {brand.name}. Pinterest and Etsy are trademarks of their respective owners.
        </p>
      </div>
    </footer>
  );
}
