import { AccountMenu } from "@/components/app/account-menu";
import { MobileNav, Sidebar } from "@/components/app/nav";
import { OfflineBanner } from "@/components/app/offline-banner";
import { StatusBanners } from "@/components/app/status-banners";
import { Logo } from "@/components/brand/logo";
import { requireUserContext } from "@/lib/auth/session";
import { getEntitlement } from "@/lib/billing/usage";
import { getAppStatus } from "@/lib/status";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, repo } = await requireUserContext();
  const [profile, entitlement] = await Promise.all([repo.getProfile(), getEntitlement(repo)]);
  const status = getAppStatus();
  const account = <AccountMenu name={profile?.displayName ?? ""} email={user.email} planName={entitlement.plan.name} />;

  return (
    <div className="flex min-h-screen">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2">
        Skip to content
      </a>
      <Sidebar footer={account} />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-14 items-center justify-between border-b border-border bg-surface px-4 lg:hidden">
          <MobileNav footer={account} />
          <Logo />
          <span className="w-9" />
        </div>
        <OfflineBanner />
        <StatusBanners dataMode={status.dataMode} aiMode={status.ai.mode} entitlement={entitlement} />
        <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
