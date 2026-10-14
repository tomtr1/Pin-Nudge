import type { Metadata, Viewport } from "next";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/dm-serif-display/400.css";
import "./globals.css";
import { Toaster } from "sonner";
import { brand, getAppUrl } from "@/lib/brand";

export const metadata: Metadata = {
  metadataBase: new URL(getAppUrl()),
  title: {
    default: `${brand.name} — ${brand.tagline}`,
    template: `%s · ${brand.name}`,
  },
  description: brand.shortDescription,
  applicationName: brand.name,
  openGraph: {
    title: `${brand.name} — ${brand.tagline}`,
    description: brand.shortDescription,
    siteName: brand.name,
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#f7f7f4",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            classNames: {
              toast: "!rounded-lg !border !border-border !bg-surface !text-foreground !shadow-lg",
              description: "!text-muted-foreground",
            },
          }}
        />
      </body>
    </html>
  );
}
