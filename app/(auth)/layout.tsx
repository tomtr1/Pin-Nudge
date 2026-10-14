import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { brand } from "@/lib/brand";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid-paper flex min-h-screen flex-col bg-surface">
      <header className="mx-auto flex h-[72px] w-full max-w-7xl items-center px-4 sm:px-8">
        <Link href="/" aria-label={`${brand.name} home`}>
          <Logo />
        </Link>
      </header>
      <main id="main" className="flex flex-1 items-start justify-center px-4 pb-16 pt-6 sm:pt-12">
        <div className="w-full max-w-md [&>div]:border-foreground [&>div]:shadow-[6px_6px_0_0_var(--foreground)]">{children}</div>
      </main>
      <footer className="px-4 pb-6 text-center text-xs text-muted-foreground">{brand.disclaimer}</footer>
    </div>
  );
}
