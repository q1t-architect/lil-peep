"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { ThemeToggle } from "@/components/providers/ThemeProvider";
import { useLocale } from "@/lib/i18n";
import { MOCK_NOTIFICATIONS } from "@/lib/data";
import { cn } from "@/lib/utils";
import type { Locale } from "@/lib/i18n";

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

function LocaleToggle() {
  const { locale, setLocale } = useLocale();
  const next: Locale = locale === "en" ? "es" : "en";

  return (
    <button
      type="button"
      onClick={() => setLocale(next)}
      className={cn(
        "relative inline-grid h-11 w-[5.5rem] grid-cols-2 rounded-full p-1",
        "bg-slate-200/95 shadow-inner ring-1 ring-brand/25 dark:bg-slate-950/80 dark:ring-brand/35",
      )}
      aria-label={`Switch to ${next === "en" ? "English" : "Español"}`}
    >
      <span
        className={cn(
          "pointer-events-none absolute inset-y-1 left-1 w-[calc(50%-6px)] rounded-full bg-white shadow-md ring-2 ring-brand/25 transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] dark:bg-slate-800 dark:ring-brand/40",
          locale === "es" && "translate-x-[calc(100%+4px)]",
        )}
      />
      <span
        className={cn(
          "relative z-10 flex items-center justify-center rounded-full py-2 text-[11px] font-bold tracking-wide transition-colors",
          locale === "en" ? "text-brand" : "text-ink-muted",
        )}
      >
        EN
      </span>
      <span
        className={cn(
          "relative z-10 flex items-center justify-center rounded-full py-2 text-[11px] font-bold tracking-wide transition-colors",
          locale === "es" ? "text-brand" : "text-ink-muted",
        )}
      >
        ES
      </span>
    </button>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { t } = useLocale();
  const unread = MOCK_NOTIFICATIONS.filter((n) => !n.read).length;

  const navLinks = [
    { href: "/", label: t("nav.map") },
    { href: "/messages", label: t("nav.messages") },
    { href: "/notifications", label: t("nav.alerts") },
  ];

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
              {t("nav.trust")}
            </Link>
          </nav>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <span className="hidden rounded-full border border-brand/20 bg-brand/5 px-3 py-1.5 text-[11px] font-medium text-brand-dim dark:border-brand/30 dark:bg-brand/10 dark:text-brand-glow xl:inline">
              {t("common.appComingSoon")}
            </span>
            <LocaleToggle />
            <ThemeToggle />
            <Link
              href="/auth-demo"
              className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white shadow-brand-soft-sm transition hover:bg-brand-dim focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
            >
              {t("nav.signIn")}
            </Link>
          </div>
        </div>
        <div className="border-t border-black/[0.03] px-4 py-2 text-center text-[11px] text-ink-muted lg:hidden dark:border-white/[0.05]">
          {t("common.appComingSoonMobile")}
        </div>
      </header>
      <div className="flex-1">{children}</div>
      <footer className="border-t border-brand/15 bg-surface-elevated/90 py-8 text-center text-xs leading-relaxed text-ink-muted dark:border-brand/20 dark:bg-slate-950/60">
        <p className="mx-auto max-w-2xl px-4">
          {t("footer.prototype")}{" "}
          <span className="font-semibold text-brand">#2596BE</span>.
        </p>
        <p className="mx-auto mt-3 max-w-2xl px-4 text-[11px] text-ink-muted/90">
          <span className="font-medium text-brand/90">{t("footer.nodeParagraphIntro")}</span>
          {t("footer.nodeParagraph")}
        </p>
      </footer>
    </div>
  );
}
