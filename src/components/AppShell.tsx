"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { ThemeToggle } from "@/components/providers/ThemeProvider";
import { MOCK_NOTIFICATIONS } from "@/lib/data";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/", label: "Map" },
  { href: "/messages", label: "Messages" },
  { href: "/notifications", label: "Alerts" },
];

type LogoProps = { className?: string; size?: "sm" | "md" | "lg"; withWordmark?: boolean };

const logoSizes = {
  sm: { wh: 32, text: "text-lg" },
  md: { wh: 40, text: "text-xl" },
  lg: { wh: 56, text: "text-2xl" },
};

/** Exported for auth splash; same file as shell to reduce file count. */
export function Logo({ className, size = "md", withWordmark = true }: LogoProps) {
  const { wh, text } = logoSizes[size];
  return (
    <Link href="/" className={cn("group inline-flex items-center gap-3", className)}>
      <span
        className={cn(
          "relative flex shrink-0 items-center justify-center overflow-hidden rounded-2xl",
          "bg-white shadow-glass ring-1 ring-black/[0.06] dark:bg-slate-900/80 dark:ring-white/10",
        )}
        style={{ width: wh, height: wh }}
      >
        <Image
          src="/logo.png"
          alt="Neighborly"
          width={wh}
          height={wh}
          className="object-contain p-0.5"
          priority
          sizes={`${wh}px`}
        />
      </span>
      {withWordmark && (
        <span className={cn("font-display font-semibold tracking-tight text-ink", text)}>Neighborly</span>
      )}
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const unread = MOCK_NOTIFICATIONS.filter((n) => !n.read).length;

  return (
    <div className="flex min-h-screen flex-col">
      <header
        className={cn(
          "sticky top-0 z-50 border-b border-brand/15 bg-surface/80 backdrop-blur-2xl dark:border-brand/25 dark:bg-slate-950/75",
        )}
      >
        <div className="mx-auto flex h-[4.25rem] max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Logo size="md" />
          <nav className="flex flex-1 justify-center gap-1 overflow-x-auto px-2 [-ms-overflow-style:none] [scrollbar-width:none] md:justify-end md:overflow-visible md:px-0 [&::-webkit-scrollbar]:hidden">
            {navLinks.map((l) => {
              const active = pathname === l.href;
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={cn(
                    "relative inline-flex rounded-full px-4 py-2 text-sm font-medium transition-colors",
                    active ? "text-ink" : "text-ink-muted hover:text-ink",
                  )}
                >
                  {active && (
                    <span className="absolute inset-0 -z-10 rounded-full bg-brand/12 dark:bg-brand/20" />
                  )}
                  {l.label}
                  {l.href === "/notifications" && unread > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-white">
                      {unread > 9 ? "9+" : unread}
                    </span>
                  )}
                </Link>
              );
            })}
            <Link
              href="/safety"
              className="rounded-full px-4 py-2 text-sm font-medium text-ink-muted hover:text-ink"
            >
              Trust &amp; safety
            </Link>
          </nav>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <span className="hidden rounded-full border border-brand/20 bg-brand/5 px-3 py-1.5 text-[11px] font-medium text-brand-dim dark:border-brand/30 dark:bg-brand/10 dark:text-brand-glow xl:inline">
              App coming soon · iOS &amp; Android
            </span>
            <ThemeToggle />
            <Link
              href="/auth-demo"
              className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white shadow-brand-soft-sm transition hover:bg-brand-dim focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
            >
              Sign in
            </Link>
          </div>
        </div>
        <div className="border-t border-black/[0.03] px-4 py-2 text-center text-[11px] text-ink-muted lg:hidden dark:border-white/[0.05]">
          Neighborly for mobile — App coming soon on iOS &amp; Android
        </div>
      </header>
      <div className="flex-1">{children}</div>
      <footer className="border-t border-brand/15 bg-surface-elevated/90 py-8 text-center text-xs leading-relaxed text-ink-muted dark:border-brand/20 dark:bg-slate-950/60">
        <p className="mx-auto max-w-2xl px-4">
          Neighborly is a presentation prototype — no real payments, accounts, or pickups. Brand accent{" "}
          <span className="font-semibold text-brand">#2596BE</span>.
        </p>
        <p className="mx-auto mt-3 max-w-2xl px-4 text-[11px] text-ink-muted/90">
          <span className="font-medium text-brand/90">Why run it this way?</span> This app is built with{" "}
          <strong className="text-ink">Node.js</strong> — the free runtime that lets your computer execute the project
          and serve a local preview at <code className="rounded bg-brand/10 px-1 text-brand-dim dark:text-brand-glow">localhost</code>.{" "}
          <strong className="text-ink">Docker</strong> is optional: teams use it to lock the same environment everywhere; you do{" "}
          <em>not</em> need Docker for day‑to‑day demos if Node is installed.
        </p>
      </footer>
    </div>
  );
}
