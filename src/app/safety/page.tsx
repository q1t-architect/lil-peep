import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Trust & Safety",
  description: "How Neighborly keeps exchanges safe: public meetups, pickup codes, transparent reputation, and fair reporting.",
};

const pillars = [
  {
    title: "Meet in well-lit public places",
    body: "Neighborly nudges handoffs toward parks, metro entrances, and busy corners — never private addresses on first exchange.",
  },
  {
    title: "Pickup codes for both sides",
    body: "A short verification token confirms the right person, the right item. Designed like the best ride-share flows.",
  },
  {
    title: "Transparent reputation",
    body: "Ratings reflect completed exchanges, not vibes. Verified neighbors have passed light identity checks in production.",
  },
  {
    title: "Report quickly, act fairly",
    body: "One-tap reporting routes to humans who understand local context. Blocks are immediate on your device in this demo.",
  },
];

export default function SafetyPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-brand">Trust &amp; safety</p>
      <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-ink">
        Neighborly is built for <span className="text-brand">calm</span>, face-to-face generosity.
      </h1>
      <p className="mt-4 text-lg text-ink-muted">
        This page is part of the investor prototype — copy and layout mirror what a funded team would ship alongside product.
      </p>

      <div className="mt-10 grid gap-5 sm:grid-cols-2">
        {pillars.map((p) => (
          <article
            key={p.title}
            className="rounded-2xl border border-black/[0.06] bg-white/70 p-6 shadow-sm dark:border-white/10 dark:bg-slate-900/60"
          >
            <h2 className="font-display text-lg font-semibold text-ink">{p.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">{p.body}</p>
          </article>
        ))}
      </div>

      <section className="mt-12 rounded-[1.75rem] border border-brand/20 bg-gradient-to-br from-brand/10 via-white/40 to-transparent p-8 dark:from-brand/20 dark:via-slate-900/40 dark:to-transparent">
        <h2 className="font-display text-xl font-semibold text-ink">Community standards (summary)</h2>
        <ul className="mt-4 space-y-3 text-sm text-ink-muted">
          <li>— Accurate photos and condition notes keep trust high.</li>
          <li>— No harassment, discrimination, or pressure — ever.</li>
          <li>— Items must be legal to share locally; no regulated goods without compliance.</li>
          <li>— Cancellations happen — communicate early and kindly.</li>
        </ul>
        <Link
          href="/"
          className="mt-6 inline-flex rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-brand-soft-sm"
        >
          Return to Neighborly map
        </Link>
      </section>
    </div>
  );
}
