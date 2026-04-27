"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import type { Listing } from "@/lib/data";
import { cn } from "@/lib/utils";

export function ListingCard({ listing, index = 0 }: { listing: Listing; index?: number }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="group"
    >
      <Link
        href={`/listing/${listing.id}`}
        className={cn(
          "flex flex-col overflow-hidden rounded-2xl glass glass-border",
          "shadow-glass transition hover:-translate-y-0.5 hover:shadow-glass-lg",
        )}
      >
        <div className="relative aspect-[4/3] overflow-hidden bg-slate-100 dark:bg-slate-800">
          <Image
            src={listing.images[0]}
            alt=""
            fill
            className="object-cover transition duration-500 group-hover:scale-[1.03]"
            sizes="(max-width:768px) 100vw, 33vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent opacity-80" />
          <div className="absolute left-3 top-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-800 backdrop-blur dark:bg-slate-900/80 dark:text-slate-100">
              {listing.category}
            </span>
            {listing.status === "reserved" && (
              <span className="rounded-full bg-amber-400/95 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-950">
                Reserved
              </span>
            )}
          </div>
          <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2">
            <span className="text-xs font-medium text-white drop-shadow">
              {listing.distanceKm.toFixed(1)} km · {listing.neighborhood}
            </span>
            <span
              className={cn(
                "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold",
                listing.priceType === "free"
                  ? "bg-emerald-500 text-white"
                  : "bg-brand text-white",
              )}
            >
              {listing.priceType === "free" ? "Free" : `€${listing.priceEuro?.toFixed(2)}`}
            </span>
          </div>
        </div>
        <div className="flex flex-1 flex-col gap-2 p-4">
          <h3 className="font-display text-lg font-semibold leading-snug tracking-tight text-ink line-clamp-2">
            {listing.title}
          </h3>
          <p className="line-clamp-2 text-sm text-ink-muted">{listing.description}</p>
          <div className="mt-auto flex items-center gap-2 border-t border-black/[0.05] pt-3 dark:border-white/[0.08]">
            <span className="relative h-9 w-9 overflow-hidden rounded-full ring-2 ring-white dark:ring-slate-800">
              <Image src={listing.owner.avatar} alt="" fill className="object-cover" sizes="36px" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">{listing.owner.name}</p>
              <p className="text-xs text-ink-muted">
                {listing.owner.rating.toFixed(2)} · {listing.owner.exchanges} exchanges
              </p>
            </div>
            {listing.owner.verified && (
              <span className="rounded-md bg-brand/10 px-2 py-0.5 text-[10px] font-semibold text-brand-dim dark:text-brand-glow">
                Verified
              </span>
            )}
          </div>
        </div>
      </Link>
    </motion.article>
  );
}
