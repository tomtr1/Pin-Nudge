import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { AnglesIllustration, LearnIllustration, PinsIllustration } from "@/components/marketing/illustrations";
import { PricingCards } from "@/components/marketing/pricing-cards";
import { Button } from "@/components/ui/button";
import { brand } from "@/lib/brand";

const blocks = [
  {
    title: "Angles",
    body: "One product, several audiences. Each campaign starts with genuinely different reasons to buy.",
    href: "/help#campaigns",
    className: "block-mint",
    Art: AnglesIllustration,
  },
  {
    title: "Pins",
    body: "Titles, descriptions and designs you can edit line by line, then download as real files.",
    href: "/help#editing",
    className: "block-blush",
    Art: PinsIllustration,
  },
  {
    title: "Planning",
    body: "Spread pins across the month and keep notes on what's actually getting clicks.",
    href: "/help#calendar",
    className: "block-sky",
    Art: LearnIllustration,
  },
];

const steps = [
  { title: "Add your product", body: "Enter the listing details once, upload your own images and paste your Etsy link as the destination." },
  { title: "Pick your angles", body: "Beginners, students, gift buyers, people saving for something. Keep the ones that fit and drop the rest." },
  { title: "Edit the pins", body: "Every pin has a title, description, keywords, image text and a layout. Change anything, or redo one pin at a time." },
  { title: "Download and plan", body: "1000 × 1500 PNGs, a CSV of your copy and a campaign summary. Then give each pin a day in the calendar." },
];

const reasons = [
  { title: "Different angles, not different colours", body: "Five pins for five audiences reach more people than five versions of the same pin." },
  { title: "Copy you'd actually post", body: "Plain, specific wording built from your listing. No hashtag walls, no made-up claims." },
  { title: "Real files, ready to upload", body: "Pins render at Pinterest's 2:3 size with your own product photos and predictable filenames." },
  { title: "Numbers you can trust", body: "Results are the ones you record. If there isn't enough data to compare, it says so." },
];

const faqs = [
  {
    q: `Does ${brand.name} post to Pinterest for me?`,
    a: `Not in this version. You download your pins, upload them to Pinterest yourself and mark them as published in ${brand.name}. Automatic posting will only come with an official, authorised Pinterest integration.`,
  },
  {
    q: "Does it read my Etsy listings automatically?",
    a: `No. ${brand.name} doesn't scrape Etsy. You paste your listing link as the destination and enter or confirm the product details yourself.`,
  },
  {
    q: "Is the copy written by AI?",
    a: `When the server is connected to an AI provider, yes — as a first draft for you to edit. If it isn't, ${brand.name} runs in demo mode and labels everything as sample content.`,
  },
  {
    q: "Will this guarantee more traffic or sales?",
    a: `No tool can promise that. ${brand.name} helps you publish more varied pins more consistently, and shows you what your own results suggest. It never claims a pin caused an Etsy sale.`,
  },
  {
    q: "Can I cancel any time?",
    a: "Yes. Plans are monthly and managed in Stripe's billing portal. You keep access until the end of the period you've paid for.",
  },
  { q: `Is ${brand.name} affiliated with Pinterest or Etsy?`, a: brand.disclaimer },
];

const examples = [
  { src: "/examples/angle-beginners.png", alt: "Example pin: budgeting for beginners, with a taped photo of a planner page", rotate: "-rotate-3", offset: "mt-10" },
  { src: "/examples/angle-saving.png", alt: "Example pin: saving for a trip, with three sticky-note benefits", rotate: "rotate-0", offset: "mt-0" },
  { src: "/examples/angle-students.png", alt: "Example pin: a student budget, written as a note to self", rotate: "rotate-3", offset: "mt-14" },
];

export default function LandingPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-surface-muted/60">
        <div className="mx-auto max-w-7xl px-4 pb-0 pt-14 text-center sm:px-8 md:pt-20">
          <Link
            href="/signup"
            className="inline-flex max-w-full items-center gap-3 border border-border bg-surface py-1.5 pl-1.5 pr-3 text-left text-sm hover:border-foreground"
          >
            <span className="bg-block-mint px-2 py-0.5 text-xs font-semibold uppercase tracking-wider">Free plan</span>
            <span className="min-w-0 font-semibold">Try the full workflow with your first product.</span>
            <ArrowRight className="size-4" aria-hidden />
          </Link>
          <h1 className="font-display mx-auto mt-8 max-w-5xl text-[44px] sm:text-6xl lg:text-[88px]">
            Turn your Etsy products into Pinterest marketing campaigns.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-foreground/80 sm:text-xl">
            Create, organize, and improve Pinterest content for your digital products without spending hours on repetitive marketing work.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" variant="secondary">
              <Link href="/#how-it-works">See how it works</Link>
            </Button>
            <Button asChild size="lg">
              <Link href="/signup">Create your first campaign</Link>
            </Button>
          </div>

          {/* Collage */}
          <div className="relative mx-auto mt-14 max-w-5xl">
            <div className="grid-paper block-sky absolute inset-x-0 bottom-0 top-16 border border-[#afcdf1]" aria-hidden />
            <div className="relative grid grid-cols-3 gap-4 px-4 pb-10 sm:gap-8 sm:px-16">
              {examples.map((e, i) => (
                <figure key={e.src} className={`${e.offset} ${e.rotate}`}>
                  <Image
                    src={e.src}
                    alt={e.alt}
                    width={600}
                    height={900}
                    priority={i === 0}
                    className="w-full border border-foreground bg-surface shadow-[6px_6px_0_0_var(--foreground)]"
                  />
                </figure>
              ))}
            </div>
            <div className="absolute -left-16 bottom-6 hidden rotate-[-4deg] border border-foreground bg-block-butter px-3 py-2 text-left shadow-[3px_3px_0_0_var(--foreground)] md:block">
              <p className="font-hand text-2xl leading-none">3 angles,</p>
              <p className="font-hand text-2xl leading-none">1 planner</p>
            </div>
            <div className="absolute -right-3 bottom-20 hidden items-center gap-2 border border-foreground bg-surface px-3 py-2 text-sm font-semibold shadow-[3px_3px_0_0_var(--foreground)] md:flex">
              <span className="flex size-5 items-center justify-center bg-accent text-white"><Check className="size-3.5" aria-hidden /></span>
              6 pins ready to export
            </div>
          </div>
          <p className="pb-6 pt-3 text-xs text-muted-foreground">
            Illustrative examples for a fictional budget planner, made with {brand.name} templates.
          </p>
        </div>
      </section>

      {/* Colour blocks */}
      <section id="features" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-20 sm:px-8">
        <div className="grid gap-5 md:grid-cols-3">
          {blocks.map((b) => (
            <Link key={b.title} href={b.href} className={`group flex flex-col ${b.className}`}>
              <h2 className="font-display px-5 pt-5 text-5xl">{b.title}</h2>
              <div className="grid-paper mt-5 aspect-[5/3] border-y border-[var(--grid-line)] p-4">
                <b.Art />
              </div>
              <div className="flex items-end justify-between gap-6 px-5 py-5">
                <p className="text-[17px] font-medium leading-snug">{b.body}</p>
                <ArrowRight className="size-6 shrink-0 transition-transform group-hover:translate-x-1" aria-hidden />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="scroll-mt-24 border-t border-border bg-surface">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-8">
          <h2 className="font-display max-w-3xl text-5xl sm:text-6xl">From one listing to a month of pins.</h2>
          <ol className="mt-14 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s, i) => (
              <li key={s.title} className="border-t-2 border-foreground pt-5">
                <span className="font-display text-6xl text-accent">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="mt-4 text-xl font-semibold">{s.title}</h3>
                <p className="mt-2 leading-relaxed text-muted-foreground">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Why */}
      <section className="border-t border-border">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-8 lg:grid-cols-[1fr_1fr] lg:items-start [&>*]:min-w-0">
          <div>
            <h2 className="font-display text-5xl sm:text-6xl">Why sellers use {brand.name}</h2>
            <p className="mt-5 max-w-lg text-lg text-foreground/80">
              Most shops run on one person. {brand.name} takes the repetitive part of Pinterest off your plate without taking your voice out of it.
            </p>
            <ul className="mt-10 divide-y divide-border border-y border-border">
              {reasons.map((r) => (
                <li key={r.title} className="py-5">
                  <h3 className="font-display text-[28px] leading-tight">{r.title}</h3>
                  <p className="mt-1.5 text-muted-foreground">{r.body}</p>
                </li>
              ))}
            </ul>
          </div>
          <div className="grid-paper block-butter border border-[#ecdc8d] p-6 sm:p-10" aria-hidden>
            <div className="border border-foreground bg-surface shadow-[6px_6px_0_0_var(--foreground)]">
              <div className="flex items-center gap-2 border-b border-foreground px-4 py-3">
                <span className="size-3 rounded-full bg-ink-tomato" />
                <span className="font-semibold">Campaign · Calm Money Planner</span>
              </div>
              <div className="space-y-5 p-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Angles</p>
                  <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {["Budgeting for beginners", "Students on a budget", "Saving for a trip", "Household bills"].map((a, i) => (
                      <div key={a} className="flex items-center justify-between border border-border px-3 py-2 text-sm">
                        {a}
                        <span className={`flex size-5 items-center justify-center border border-foreground ${i < 3 ? "bg-accent text-white" : "bg-surface"}`}>
                          {i < 3 ? <Check className="size-3.5" /> : null}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Next up</p>
                  <ul className="mt-2 divide-y divide-border border border-border text-sm">
                    {[["Tue 20", "Budgeting for beginners, made calm"], ["Thu 22", "A student budget that actually fits"], ["Mon 26", "Save for the trip you keep postponing"]].map(([d, t]) => (
                      <li key={d} className="flex gap-3 px-3 py-2">
                        <span className="w-14 shrink-0 font-semibold">{d}</span>
                        <span className="truncate">{t}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
            <p className="mt-6 font-hand text-3xl">plan once, post all month →</p>
          </div>
        </div>
      </section>

      {/* Honest by design */}
      <section className="bg-foreground text-background">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-16 sm:px-8 md:grid-cols-[1.2fr_1fr] md:items-center">
          <h2 className="font-display text-4xl sm:text-5xl">No invented numbers. No fake “published”.</h2>
          <p className="text-lg text-background/80">
            {brand.name} never makes up analytics, search volumes or results. Metrics you enter are labelled as yours, sample content is labelled as
            sample, and a pin only counts as published when you say so.
          </p>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-20 sm:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-display text-5xl sm:text-6xl">Simple monthly pricing</h2>
            <p className="mt-3 text-lg text-foreground/80">Start free. Upgrade when it earns its place in your week.</p>
          </div>
          <Link href="/pricing" className="inline-flex items-center gap-1.5 font-semibold underline underline-offset-4">
            Compare plans <ArrowRight className="size-4" />
          </Link>
        </div>
        <div className="mt-12">
          <PricingCards />
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-24 border-t border-border bg-surface">
        <div className="mx-auto max-w-4xl px-4 py-20 sm:px-8">
          <h2 className="font-display text-5xl sm:text-6xl">Questions sellers ask</h2>
          <div className="mt-10 border-t border-foreground">
            {faqs.map((f) => (
              <details key={f.q} className="group border-b border-border py-5 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6">
                  <span className="font-display text-2xl sm:text-[28px]">{f.q}</span>
                  <span className="text-2xl transition-transform group-open:rotate-45" aria-hidden>
                    +
                  </span>
                </summary>
                <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-8">
        <div className="grid-paper block-mint border border-[#bfe4b2] px-6 py-16 text-center sm:px-12">
          <h2 className="font-display mx-auto max-w-3xl text-5xl sm:text-7xl">{brand.tagline}</h2>
          <p className="mx-auto mt-5 max-w-xl text-lg text-foreground/80">Add a product and have a full campaign to review in a few minutes.</p>
          <Button asChild size="lg" className="mt-9">
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
