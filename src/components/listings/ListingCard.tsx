"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import type { ListingWithOwner } from "@/lib/listings.server";
import { useLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

function toCard(l: ListingWithOwner) {
  return {
    id: l.id,
    title: l.title,
    description: l.description ?? "",
    category: l.category,
    images: l.images,
    neighborhood: l.neighborhood ?? "",
    status: l.status,
    priceType: l.price_type,
    priceEuro: l.price_euro,
    distanceKm: l.distance_km ?? 0,
    owner: {
      name: l.owner?.name ?? "Unknown",
      avatar: l.owner?.avatar_url ?? "",
      rating: l.owner?.rating ?? 0,
      exchanges: l.owner?.exchanges ?? 0,
      verified: l.owner?.verified ?? false,
    },
  };
}

export function ListingCard({ listing, index = 0 }: { listing: ListingWithOwner; index?: number }) {
  const { t } = useLocale();
  const c = toCard(listing);

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="group"
    >
      <Link
        href={`/listing/${c.id}`}
        className={cn(
          "flex flex-col overflow-hidden rounded-2xl glass glass-border",
          "shadow-glass transition hover:-translate-y-0.5 hover:shadow-glass-lg",
        )}
      >
        <div className="relative aspect-[4/3] overflow-hidden bg-slate-100 dark:bg-slate-800">
          {c.images?.[0] ? (
            <Image
              src={c.images[0]}
              alt=""
              fill
              className="object-cover transition duration-500 group-hover:scale-[1.03]"
              sizes="(max-width:768px) 100vw, 33vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-ink-muted">No image</div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent opacity-80" />
          <div className="absolute left-3 top-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-800 backdrop-blur dark:bg-slate-900/80 dark:text-slate-100">
              {c.category}
            </span>
            {c.status === "reserved" && (
              <span className="rounded-full bg-amber-400/95 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-950">
                {t("common.reserved")}
              </span>
            )}
          </div>
          <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2">
            <span className="text-xs font-medium text-white drop-shadow">
              {c.distanceKm.toFixed(1)} km · {c.neighborhood}
            </span>
            <span
              className={cn(
                "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold",
                c.priceType === "free"
                  ? "bg-emerald-500 text-white"
                  : "bg-brand text-white",
              )}
            >
              {c.priceType === "free" ? t("common.free") : `€${c.priceEuro?.toFixed(2)}`}
            </span>
          </div>
        </div>
        <div className="flex flex-1 flex-col gap-2 p-4">
          <h3 className="font-display text-lg font-semibold leading-snug tracking-tight text-ink line-clamp-2">
            {c.title}
          </h3>
          <p className="line-clamp-2 text-sm text-ink-muted">{c.description}</p>
          <div className="mt-auto flex items-center gap-2 border-t border-black/[0.05] pt-3 dark:border-white/[0.08]">
            <span className="relative h-9 w-9 overflow-hidden rounded-full ring-2 ring-white dark:ring-slate-800">
              {c.owner.avatar ? (
                <Image src={c.owner.avatar} alt="" fill className="object-cover" sizes="36px" />
              ) : (
                <span className="flex h-full w-full items-center justify-center bg-brand/10 text-sm font-medium text-brand">
                  {c.owner.name.charAt(0)}
                </span>
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">{c.owner.name}</p>
              <p className="text-xs text-ink-muted">
                {c.owner.rating.toFixed(2)} · {c.owner.exchanges} {t("common.exchanges")}
              </p>
            </div>
            {c.owner.verified && (
              <span className="rounded-md bg-brand/10 px-2 py-0.5 text-[10px] font-semibold text-brand-dim dark:text-brand-glow">
                {t("common.verified")}
              </span>
            )}
          </div>
        </div>
      </Link>
    </motion.article>
  );
}
