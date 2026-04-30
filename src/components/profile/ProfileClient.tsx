"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { useLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type Profile = {
  id: string;
  name: string;
  avatar_url: string | null;
  neighborhood: string | null;
  bio: string | null;
  rating: number;
  exchanges: number;
};

type Listing = {
  id: string;
  title: string;
  category: string;
  status: string;
  price_type: string;
  price_euro: number | null;
  images: string[];
  created_at: string;
};

export function ProfileClient({
  profile,
  listings,
}: {
  profile: Profile;
  listings: Listing[];
}) {
  const { t } = useLocale();

  const avatarUrl = profile.avatar_url;
  const initials = profile.name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Header card */}
      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-brand/15 via-surface to-surface p-8 shadow-glass-lg ring-1 ring-black/[0.05] dark:from-brand/25 dark:via-slate-950 dark:to-slate-950 dark:ring-white/10 sm:p-10">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-3xl ring-4 ring-white/80 shadow-xl dark:ring-slate-800">
              {avatarUrl ? (
                <Image src={avatarUrl} alt="" fill className="object-cover" sizes="112px" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-brand text-3xl font-bold text-white">
                  {initials || "?"}
                </div>
              )}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">
                  {profile.name}
                </h1>
              </div>
              <p className="mt-1 text-sm text-ink-muted">
                {profile.neighborhood
                  ? `${profile.neighborhood} · ${t("profile.memberSince")}`
                  : t("profile.memberSince")}
              </p>
              {profile.bio && (
                <p className="mt-4 max-w-xl text-sm leading-relaxed text-ink-muted">
                  {profile.bio}
                </p>
              )}
            </div>
          </div>

          <div className="grid w-full max-w-md grid-cols-2 gap-3 sm:grid-cols-3 lg:w-auto">
            <TrustTile
              label={t("profile.trustScore")}
              value={profile.rating.toFixed(2)}
              hint={t("profile.rollingDays")}
            />
            <TrustTile
              label={t("profile.exchanges")}
              value={String(profile.exchanges)}
              hint={t("profile.completedNearby")}
            />
            <TrustTile
              label={t("profile.response")}
              value={t("profile.responseFast")}
              hint={t("profile.responseHint")}
              className="col-span-2 sm:col-span-1"
            />
          </div>
        </div>
      </div>

      {/* Listings section */}
      <section className="mt-10">
        <h2 className="font-display text-lg font-semibold text-ink">
          {t("profile.activeListings")}
        </h2>
        <p className="mt-1 text-sm text-ink-muted">{t("profile.activeListingsDesc")}</p>
        {listings.length === 0 ? (
          <p className="mt-6 text-sm text-ink-muted">{t("profile.noListings")}</p>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((l, i) => (
              <motion.div
                key={l.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <Link
                  href={`/listing/${l.id}`}
                  className="group block overflow-hidden rounded-2xl border border-black/[0.06] bg-white/60 transition hover:shadow-lg dark:border-white/10 dark:bg-slate-900/50"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-slate-100 dark:bg-slate-800">
                    {l.images?.[0] ? (
                      <Image
                        src={l.images[0]}
                        alt={l.title}
                        fill
                        className="object-cover transition group-hover:scale-105"
                        sizes="(max-width:640px)100vw,(max-width:1024px)50vw,33vw"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-3xl text-slate-300 dark:text-slate-600">
                        📦
                      </div>
                    )}
                    <span
                      className={cn(
                        "absolute right-2 top-2 rounded-full px-2.5 py-0.5 text-[11px] font-bold",
                        l.status === "available"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                          : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
                      )}
                    >
                      {l.status === "available" ? "✓ Available" : "◷ Reserved"}
                    </span>
                  </div>
                  <div className="p-4">
                    <h3 className="text-sm font-semibold text-ink">{l.title}</h3>
                    <div className="mt-1 flex items-center gap-2 text-xs text-ink-muted">
                      <span>{l.category}</span>
                      <span>·</span>
                      <span className="font-semibold text-brand">
                        {l.price_type === "free" ? "Free" : `€${l.price_euro}`}
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* Sidebar */}
      <section className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div>{/* Placeholder for future reviews from Supabase */}</div>
        <aside className="space-y-6">
          <div className="rounded-2xl border border-black/[0.06] bg-white/60 p-5 dark:border-white/10 dark:bg-slate-900/50">
            <h3 className="text-sm font-semibold text-ink">
              {t("profile.communityStandards")}
            </h3>
            <ul className="mt-3 space-y-2 text-xs text-ink-muted">
              <li className="flex gap-2">
                <span className="text-brand">●</span> {t("profile.csPublicMeetups")}
              </li>
              <li className="flex gap-2">
                <span className="text-brand">●</span> {t("profile.csAccurateCondition")}
              </li>
              <li className="flex gap-2">
                <span className="text-brand">●</span> {t("profile.csRespectfulCancel")}
              </li>
            </ul>
            <Link
              href="/safety"
              className="mt-4 inline-block text-xs font-semibold text-brand hover:underline"
            >
              {t("profile.safetyLink")}
            </Link>
          </div>
        </aside>
      </section>
    </div>
  );
}

function TrustTile({
  label,
  value,
  hint,
  className,
}: {
  label: string;
  value: string;
  hint: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/50 bg-white/70 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-slate-900/70",
        className
      )}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold text-ink">{value}</p>
      <p className="mt-1 text-[11px] text-ink-muted">{hint}</p>
    </div>
  );
}
