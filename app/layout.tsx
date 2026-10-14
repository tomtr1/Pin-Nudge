import type { Metadata, Viewport } from "next";
import "@fontsource/instrument-sans/400.css";
import "@fontsource/instrument-sans/500.css";
import "@fontsource/instrument-sans/600.css";
import "@fontsource/instrument-sans/700.css";
import "@fontsource/newsreader/400.css";
import "@fontsource/newsreader/500.css";
import "@fontsource/newsreader/400-italic.css";
import "@fontsource/caveat/600.css";
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
  themeColor: "#fbfaf7",
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
              toast: "!rounded-[3px] !border !border-foreground !bg-surface !text-foreground !shadow-[4px_4px_0_0_var(--foreground)]",
              description: "!text-muted-foreground",
            },
          }}
        />
      </body>
    </html>
  );
}
