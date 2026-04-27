import Image from "next/image";
import Link from "next/link";
import { Logo } from "@/components/AppShell";

export default function AuthDemoPage() {
  return (
    <div className="relative min-h-[calc(100vh-8rem)] overflow-hidden px-4 py-16 sm:px-6">
      <div className="pointer-events-none absolute inset-0 bg-hero-mesh opacity-70 dark:opacity-40" />
      <div className="pointer-events-none absolute -left-32 top-20 h-96 w-96 rounded-full bg-brand/20 blur-3xl dark:bg-brand/30" />
      <div className="pointer-events-none absolute -right-20 bottom-10 h-80 w-80 rounded-full bg-brand/15 blur-3xl" />

      <div className="relative mx-auto grid max-w-5xl gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center">
        <div className="space-y-6 text-center lg:text-left">
          <div className="flex justify-center lg:justify-start">
            <Logo size="lg" />
          </div>
          <h1 className="font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
            Welcome home to Neighborly
          </h1>
          <p className="text-balance text-lg text-ink-muted">
            Sign-in is simulated in this prototype. Imagine passkeys or phone OTP — fast, minimal, and never in the way of
            a ladder handoff.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 lg:justify-start">
            <span className="rounded-full border border-brand/25 bg-brand/10 px-4 py-2 text-xs font-semibold text-brand-dim dark:text-brand-glow">
              App coming soon · iOS &amp; Android
            </span>
          </div>
        </div>

        <div className="glass glass-border mx-auto w-full max-w-md rounded-[2rem] p-8 shadow-glass-lg">
          <div className="mb-6 flex justify-center">
            <div className="relative h-20 w-20 overflow-hidden rounded-3xl ring-2 ring-brand/20">
              <Image src="/logo.png" alt="" fill className="object-contain p-1" priority />
            </div>
          </div>
          <p className="text-center text-sm font-medium text-ink-muted">Demo credentials</p>
          <div className="mt-4 space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-wide text-ink-muted">
              Email
              <input
                readOnly
                defaultValue="you@neighborly.demo"
                className="mt-1 w-full rounded-xl border border-black/[0.08] bg-white px-4 py-3 text-sm dark:border-white/10 dark:bg-slate-900"
              />
            </label>
            <label className="block text-xs font-semibold uppercase tracking-wide text-ink-muted">
              Password
              <input
                readOnly
                type="password"
                defaultValue="neighborly"
                className="mt-1 w-full rounded-xl border border-black/[0.08] bg-white px-4 py-3 text-sm dark:border-white/10 dark:bg-slate-900"
              />
            </label>
          </div>
          <Link
            href="/"
            className="mt-6 flex w-full items-center justify-center rounded-2xl bg-brand py-3.5 text-sm font-semibold text-white shadow-brand-soft transition hover:bg-brand-dim"
          >
            Continue to Neighborly
          </Link>
          <p className="mt-4 text-center text-xs text-ink-muted">
            By continuing you agree to the Neighborly Community Standards (demo copy).
          </p>
        </div>
      </div>
    </div>
  );
}
