import type { Metadata } from "next";
import { DraftLegalNotice, Prose } from "@/components/marketing/legal-notice";
import { brand } from "@/lib/brand";

export const metadata: Metadata = { title: "Terms" };

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="font-display text-5xl sm:text-6xl">Terms of service</h1>
      <p className="mt-2 text-sm text-muted-foreground">Placeholder version for the {brand.name} prototype.</p>
      <div className="mt-6">
        <DraftLegalNotice />
      </div>
      <Prose>
        <h2>The service</h2>
        <p>
          {brand.name} helps sellers create, organise and export Pinterest marketing content for their own products. Generated content is a draft
          that you are responsible for reviewing before you publish it anywhere.
        </p>

        <h2>Your content</h2>
        <ul>
          <li>You keep ownership of the products, images and text you provide, and of the pins you export.</li>
          <li>You confirm you have the rights to the images and information you upload.</li>
          <li>You are responsible for complying with Pinterest's and Etsy's rules when you publish or link content.</li>
        </ul>

        <h2>AI-generated content</h2>
        <p>
          Copy suggestions may be inaccurate or unsuitable. {brand.name} does not guarantee traffic, sales or other results, and keyword
          suggestions are ideas rather than measured search data.
        </p>

        <h2>Subscriptions</h2>
        <ul>
          <li>Paid plans renew monthly until canceled and are billed through Stripe.</li>
          <li>You can cancel at any time in the billing portal; access continues until the end of the current paid period.</li>
          <li>Plan limits are described on the pricing page and may change with notice.</li>
        </ul>

        <h2>Acceptable use</h2>
        <p>Don't use the service to create unlawful, deceptive or infringing content, or to attempt to access other users' data.</p>

        <h2>Third-party platforms</h2>
        <p>{brand.disclaimer}</p>

        <h2>Changes and contact</h2>
        <p>The operator's legal entity, governing law, liability terms and contact details must be added here before launch.</p>
      </Prose>
    </article>
  );
}
