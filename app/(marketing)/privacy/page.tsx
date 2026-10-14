import type { Metadata } from "next";
import { DraftLegalNotice, Prose } from "@/components/marketing/legal-notice";
import { brand } from "@/lib/brand";

export const metadata: Metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">Privacy notice</h1>
      <p className="mt-2 text-sm text-muted-foreground">Placeholder version for the {brand.name} prototype.</p>
      <div className="mt-6">
        <DraftLegalNotice />
      </div>
      <Prose>
        <h2>What {brand.name} stores</h2>
        <ul>
          <li>Account data: your email address and an encrypted password managed by the authentication provider.</li>
          <li>Profile and preferences you enter during onboarding or in settings (store name, links, audience, language, goals).</li>
          <li>Products you add, including descriptions, keywords, destination links and the images you upload.</li>
          <li>Campaigns, marketing angles and pins, including any edits you make.</li>
          <li>Metrics you enter manually for your pins, labelled as manually reported.</li>
          <li>Usage records (for example, how many campaigns you generated) to enforce plan limits and estimate costs.</li>
          <li>Subscription status and Stripe customer and subscription identifiers. Card details are handled by Stripe and never stored by {brand.name}.</li>
        </ul>

        <h2>Service providers that may receive data</h2>
        <ul>
          <li><strong>Supabase</strong> — database, authentication and file storage.</li>
          <li><strong>Anthropic</strong> (when AI generation is enabled) — receives the product and campaign details needed to write copy: product name, description, category, benefit, audience, keywords and campaign settings. Your email, payment details and uploaded images are not sent.</li>
          <li><strong>Stripe</strong> — payment processing and the billing portal, if you subscribe.</li>
          <li><strong>Hosting provider</strong> — serves the application and may process request logs.</li>
        </ul>
        <p>The operator must list the actual providers, their locations and the legal basis for each transfer before launch.</p>

        <h2>What {brand.name} does not do</h2>
        <ul>
          <li>It does not scrape Etsy or Pinterest, and does not access your Etsy or Pinterest accounts.</li>
          <li>It does not sell personal data or use it for advertising.</li>
        </ul>

        <h2>Your controls</h2>
        <ul>
          <li>Edit your profile, products and campaigns at any time.</li>
          <li>Download a copy of your data from Settings → Privacy &amp; data.</li>
          <li>Permanently delete your account from Settings. This cancels any active subscription and deletes your records and uploaded files.</li>
        </ul>

        <h2>Contact</h2>
        <p>
          {brand.supportEmail ? (
            <>
              Questions about privacy: <a className="text-accent underline" href={`mailto:${brand.supportEmail}`}>{brand.supportEmail}</a>.
            </>
          ) : (
            "The operator's privacy contact will be published here before launch."
          )}
        </p>
        <p className="text-sm text-muted-foreground">{brand.disclaimer}</p>
      </Prose>
    </article>
  );
}
