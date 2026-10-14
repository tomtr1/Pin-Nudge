import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Compass,
  Download,
  LayoutTemplate,
  LineChart,
  PenLine,
  ShieldCheck,
} from "lucide-react";
import { PricingCards } from "@/components/marketing/pricing-cards";
import { Button } from "@/components/ui/button";
import { brand } from "@/lib/brand";

const steps = [
  { title: "Add your product", body: "Enter your listing details once, upload your own product images and paste your Etsy link as the destination." },
  { title: "Choose distinct angles", body: "PinNudge suggests genuinely different audiences and messages — beginners, students, gift-givers — not just new colours." },
  { title: "Review every pin", body: "Each pin comes with a title, description, keywords, overlay text and a template. Edit anything, regenerate one pin at a time." },
  { title: "Export and plan", body: "Download real 1000×1500 PNGs, a CSV of your copy and a campaign summary. Plan publishing dates in the calendar." },
];

const features = [
  { icon: Compass, title: "Differentiated marketing angles", body: "Every campaign starts with a set of distinct audiences and problems, so your pins reach different searchers instead of repeating themselves." },
  { icon: PenLine, title: "Pinterest-ready copy", body: "Natural titles and descriptions with realistic keyword suggestions. No keyword stuffing, no invented search volumes." },
  { icon: LayoutTemplate, title: "Editable vertical templates", body: "Six clean 2:3 layouts using your own product images, colours and typography. What you preview is exactly what you download." },
  { icon: Download, title: "PNG, ZIP and CSV export", body: "Download single pins or a ZIP of every approved pin with predictable filenames, plus a CSV of titles, descriptions and links." },
  { icon: CalendarDays, title: "Content calendar", body: "Assign planned dates and mark pins as published once you've posted them. Nothing is posted on your behalf." },
  { icon: LineChart, title: "Learn from real results", body: "Record your pin results and get comparisons that show the numbers behind every suggestion — or an honest “not enough data yet”." },
];

const faqs = [
  {
    q: "Does PinNudge post to Pinterest for me?",
    a: "Not in this version. You export your pins and upload them to Pinterest yourself, then mark them as published in PinNudge. We will only offer automatic publishing once an official, authorised Pinterest integration is in place.",
  },
  {
    q: "Does it read my Etsy listings automatically?",
    a: "No. PinNudge does not scrape Etsy. You paste your listing link as the destination URL and enter or confirm the product details yourself. That keeps your data accurate and respects Etsy's rules.",
  },
  {
    q: "Is the copy written by AI?",
    a: "Yes, when the server is connected to an AI provider. Every pin is a draft for you to review and edit. If AI isn't configured, PinNudge runs in demo mode and clearly labels the results as sample content.",
  },
  {
    q: "Will this guarantee more traffic or sales?",
    a: "No tool can promise that. PinNudge helps you produce more varied, consistent content and shows you what your own recorded results suggest. It never claims a pin caused an Etsy sale.",
  },
  {
    q: "Can I cancel any time?",
    a: "Yes. Paid plans are monthly subscriptions managed through Stripe's billing portal. You keep access until the end of the period you've paid for.",
  },
  {
    q: "Is PinNudge affiliated with Pinterest or Etsy?",
    a: brand.disclaimer,
  },
];

const examples = [
  { src: "/examples/angle-beginners.png", angle: "Beginners", alt: "Example pin: 'Budgeting for beginners, made calm' with an illustrated planner page" },
  { src: "/examples/angle-saving.png", angle: "Saving goals", alt: "Example pin: 'Save for the trip you keep postponing' with three benefit points" },
  { src: "/examples/angle-students.png", angle: "Students", alt: "Example pin: 'A student budget that actually fits' in a problem-and-solution layout" },
];

export default function LandingPage() {
  return (
    <>
      {/* Hero */}
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-12 sm:px-6 md:pt-20 lg:grid-cols-[1.05fr_1fr]">
        <div>
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted-foreground">
            For Etsy digital-product sellers
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-4xl leading-[1.08] tracking-tight sm:text-5xl lg:text-[3.4rem]">
            Turn your Etsy products into Pinterest marketing campaigns.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
            Create, organize, and improve Pinterest content for your digital products without spending hours on repetitive marketing work.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button asChild size="lg">
              <Link href="/signup">
                Create your first campaign <ArrowRight />
              </Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link href="/#how-it-works">See how it works</Link>
            </Button>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">Free plan available. No credit card required to start.</p>
        </div>
        <div className="relative">
          <div className="grid grid-cols-3 gap-3">
            {examples.map((e, i) => (
              <figure key={e.src} className={i === 1 ? "translate-y-6" : ""}>
                <Image
                  src={e.src}
                  alt={e.alt}
                  width={600}
                  height={900}
                  priority={i === 0}
                  className="w-full rounded-lg border border-border shadow-[0_12px_30px_rgba(31,36,33,0.10)]"
                />
                <figcaption className="mt-2 text-center text-xs text-muted-foreground">Angle: {e.angle}</figcaption>
              </figure>
            ))}
          </div>
          <p className="mt-10 text-center text-xs text-muted-foreground">
            Illustrative examples for a fictional budget planner, rendered with PinNudge templates.
          </p>
        </div>
      </section>

      {/* Explanation */}
      <section className="border-y border-border bg-surface">
        <div className="mx-auto max-w-3xl px-4 py-14 text-center sm:px-6">
          <h2 className="text-2xl font-semibold tracking-tight">One product. Many audiences. A plan you can actually keep.</h2>
          <p className="mt-4 leading-relaxed text-muted-foreground">
            A single digital planner can help beginners, students, families and savers — but each of them searches Pinterest differently.
            PinNudge turns one listing into a campaign of distinct angles, ready-to-edit pins and export files, then helps you see which messages
            are earning outbound clicks so your next campaign is better than the last.
          </p>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">How a campaign comes together</h2>
        <p className="mt-2 max-w-2xl text-muted-foreground">From product to downloadable pins in a few guided steps.</p>
        <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <li key={s.title} className="rounded-lg border border-border bg-surface p-5">
              <span className="flex size-8 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent-soft-foreground">{i + 1}</span>
              <h3 className="mt-4 font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Features */}
      <section id="features" className="scroll-mt-20 border-t border-border bg-surface-muted/60">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Built for the way solo sellers work</h2>
          <div className="mt-10 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div key={f.title}>
                <f.icon className="size-5 text-accent" aria-hidden />
                <h3 className="mt-3 font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-12 flex flex-wrap items-start gap-3 rounded-lg border border-border bg-surface p-5 text-sm">
            <ShieldCheck className="mt-0.5 size-5 text-accent" aria-hidden />
            <p className="max-w-3xl text-muted-foreground">
              <span className="font-medium text-foreground">Honest by design.</span> PinNudge never invents analytics, search volumes or results.
              Metrics you enter are labelled as manually reported, sample content is labelled as sample, and nothing is marked “published” unless you did it.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Simple monthly pricing</h2>
            <p className="mt-2 text-muted-foreground">Start free. Upgrade when PinNudge earns its place in your week.</p>
          </div>
          <Link href="/pricing" className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline">
            Compare plans <ArrowRight className="size-4" />
          </Link>
        </div>
        <div className="mt-10">
          <PricingCards />
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-20 border-t border-border bg-surface">
        <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Questions sellers ask</h2>
          <div className="mt-8 divide-y divide-border rounded-lg border border-border">
            {faqs.map((f) => (
              <details key={f.q} className="group px-5 py-4 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
                  {f.q}
                  <span className="text-muted-foreground transition-transform group-open:rotate-45" aria-hidden>
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="rounded-xl bg-foreground px-6 py-12 text-center text-background sm:px-12">
          <h2 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl">{brand.tagline}</h2>
          <p className="mx-auto mt-3 max-w-xl text-background/75">Set up your first product and generate a complete campaign in a few minutes.</p>
          <Button asChild size="lg" className="mt-8">
            <Link href="/signup">
              Create your first campaign <ArrowRight />
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
}

export const metadata = {
  title: { absolute: `${brand.name} — ${brand.tagline}` },
};
