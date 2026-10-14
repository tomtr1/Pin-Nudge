import type { Metadata } from "next";
import Link from "next/link";
import { Mail } from "lucide-react";
import { Prose } from "@/components/marketing/legal-notice";
import { brand } from "@/lib/brand";

export const metadata: Metadata = { title: "Help" };

const topics = [
  {
    id: "products",
    title: "Adding a product",
    body: (
      <>
        <p>Go to <strong>Products → Add product</strong>. Enter the name, a short description, the main benefit and who it's for. Add a few keywords buyers might search for.</p>
        <p>Paste your Etsy listing link as the <strong>destination URL</strong>. {brand.name} does not read or scrape the listing — it only uses the link as the place your pins send people. Upload your own product images (PNG or JPEG, up to 5 MB each).</p>
      </>
    ),
  },
  {
    id: "campaigns",
    title: "Creating a campaign",
    body: (
      <>
        <p>Open <strong>Campaigns → New campaign</strong> and follow the steps: choose a product, set the audience, tone, number of pins and angles, then generate marketing angles.</p>
        <p>Review the angles — edit them or untick the ones you don't want — and generate the pins. Each campaign generation counts towards your monthly plan limit.</p>
      </>
    ),
  },
  {
    id: "editing",
    title: "Editing and regenerating pins",
    body: (
      <>
        <p>Click any pin to edit its title, description, keywords, overlay text, link and design. The preview uses the same renderer as the download, so what you see is what you export.</p>
        <p>Use <strong>Regenerate copy</strong> or <strong>Regenerate creative</strong> to get a fresh version of one pin. Fields you edited by hand are kept unless you choose to overwrite them. Regenerations count towards a separate monthly limit.</p>
      </>
    ),
  },
  {
    id: "exporting",
    title: "Exporting and posting to Pinterest",
    body: (
      <>
        <p>Approve the pins you're happy with, then download individual PNGs, a CSV of your copy, a campaign summary, or (on Growth and Pro) a ZIP of all approved pins.</p>
        <p>Posting is manual: upload each image in Pinterest, paste the title, description and link from the CSV, and choose a board. The CSV is a reference sheet; Pinterest's own bulk-upload format requires publicly hosted image URLs, which {brand.name} does not create.</p>
        <p>After posting, mark the pin as published in {brand.name} so your calendar and analytics stay accurate.</p>
      </>
    ),
  },
  {
    id: "calendar",
    title: "Planning with the calendar",
    body: <p>On Growth and Pro you can give each pin a planned date and filter by product or status. A planned date is a reminder for you — {brand.name} does not post automatically.</p>,
  },
  {
    id: "analytics",
    title: "Tracking results",
    body: (
      <>
        <p>Copy impressions, saves, pin clicks and outbound clicks from your Pinterest analytics into <strong>Analytics → Add results</strong>. Entries are labelled as manually reported.</p>
        <p>Comparisons only appear when pins have enough impressions to compare, and every suggestion shows the numbers behind it. {brand.name} can't tell which pin led to an Etsy sale, so it never claims that.</p>
      </>
    ),
  },
  {
    id: "billing",
    title: "Plans and billing",
    body: <p>Upgrade, change plan or cancel from <strong>Settings → Plan &amp; billing</strong>. Payments are handled by Stripe. Usage limits reset on the first day of each month (UTC).</p>,
  },
  {
    id: "data",
    title: "Your data",
    body: <p>Download everything you've stored from <strong>Settings → Privacy &amp; data</strong>, or permanently delete your account there. See the <Link className="text-accent underline" href="/privacy">privacy notice</Link> for which providers process your data.</p>,
  },
];

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
      <h1 className="font-display text-5xl sm:text-6xl">Help</h1>
      <p className="mt-2 text-muted-foreground">How the core workflows in {brand.name} work.</p>
      <div className="mt-10 grid gap-10 md:grid-cols-[200px_1fr]">
        <nav aria-label="Help topics" className="md:sticky md:top-24 md:self-start">
          <ul className="space-y-2 text-sm">
            {topics.map((t) => (
              <li key={t.id}>
                <a className="text-muted-foreground hover:text-foreground" href={`#${t.id}`}>{t.title}</a>
              </li>
            ))}
            <li>
              <a className="text-muted-foreground hover:text-foreground" href="#contact">Contact</a>
            </li>
          </ul>
        </nav>
        <div className="space-y-12">
          {topics.map((t) => (
            <section key={t.id} id={t.id} className="scroll-mt-24">
              <h2 className="font-display text-3xl">{t.title}</h2>
              <div className="mt-3">
                <Prose>{t.body}</Prose>
              </div>
            </section>
          ))}
          <section id="contact" className="scroll-mt-24 rounded-lg border border-border bg-surface p-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Mail className="size-5 text-accent" aria-hidden /> Contact
            </h2>
            {brand.supportEmail ? (
              <p className="mt-2 text-sm text-muted-foreground">
                Email <a className="text-accent underline" href={`mailto:${brand.supportEmail}`}>{brand.supportEmail}</a> and include the email address on your account. We never ask for your password.
              </p>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                A support contact hasn't been configured for this deployment yet. (Operators: set <code className="rounded bg-surface-muted px-1">NEXT_PUBLIC_SUPPORT_EMAIL</code>.)
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
