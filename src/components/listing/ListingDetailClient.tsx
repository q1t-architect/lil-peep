"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { useLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { ListingWithOwner } from "@/lib/listings.server";
import { ReservationModal } from "@/components/reservation/ReservationModal";

interface Props {
  listing: ListingWithOwner;
  currentUserId?: string;
}

export function ListingDetailClient({ listing, currentUserId }: Props) {
  const { t } = useLocale();
  const [photo, setPhoto] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [status, setStatus] = useState(listing.status);
  const [modalOpen, setModalOpen] = useState(false);

  const isOwner = currentUserId && currentUserId === listing.owner_id;

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2400);
  };

  const priceLabel =
    listing.price_type === "free"
      ? t("common.free")
      : `€${(listing.price_euro ?? 0).toFixed(2)}`;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm font-medium text-ink-muted transition hover:text-brand"
      >
        ← Neighborly
      </Link>

      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        {/* Photos */}
        <div className="space-y-4">
          <div className="relative aspect-[4/3] overflow-hidden rounded-[1.75rem] bg-slate-100 shadow-glass-lg ring-1 ring-black/[0.06] dark:bg-slate-800 dark:ring-white/10">
            {listing.images?.[photo] ? (
              <Image
                src={listing.images[photo]}
                alt=""
                fill
                className="object-cover"
                priority
                sizes="(max-width:1024px) 100vw, 55vw"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-ink-muted">No photo</div>
            )}
            <div className="absolute left-4 top-4 flex gap-2">
              <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-800 backdrop-blur dark:bg-slate-900/80 dark:text-slate-100">
                {listing.category}
              </span>
              {status === "reserved" && (
                <span className="rounded-full bg-amber-400 px-3 py-1 text-xs font-bold text-amber-950">
                  {t("common.reserved")}
                </span>
              )}
            </div>
          </div>

          {(listing.images?.length ?? 0) > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {listing.images.map((src, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setPhoto(i)}
                  className={cn(
                    "relative h-16 w-24 shrink-0 overflow-hidden rounded-xl ring-2 transition",
                    photo === i ? "ring-brand" : "ring-transparent hover:ring-brand/30",
                  )}
                >
                  <Image src={src} alt="" fill className="object-cover" sizes="96px" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="space-y-6">
          <div>
            {listing.distance_km != null && (
              <p className="text-xs font-semibold uppercase tracking-widest text-brand">
                {listing.distance_km.toFixed(1)} km · {listing.neighborhood}
              </p>
            )}
            <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
              {listing.title}
            </h1>
            {listing.description && (
              <p className="mt-4 text-base leading-relaxed text-ink-muted">{listing.description}</p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span
              className={cn(
                "rounded-full px-4 py-2 text-sm font-bold",
                listing.price_type === "free" ? "bg-emerald-500 text-white" : "bg-brand text-white",
              )}
            >
              {priceLabel}
            </span>
            <span className="text-sm text-ink-muted">Pickup only</span>
          </div>

          {/* Owner card */}
          <div className="glass glass-border rounded-2xl p-5">
            <div className="flex items-center gap-3">
              <Link
                href={`/profile/${listing.owner.id}`}
                className="relative block h-14 w-14 overflow-hidden rounded-2xl ring-2 ring-brand/20"
              >
                {listing.owner.avatar_url ? (
                  <Image src={listing.owner.avatar_url} alt="" fill className="object-cover" sizes="56px" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-brand/10 text-brand">
                    {listing.owner.name.charAt(0)}
                  </div>
                )}
              </Link>
              <div className="min-w-0 flex-1">
                <Link href={`/profile/${listing.owner.id}`} className="font-semibold text-ink hover:text-brand">
                  {listing.owner.name}
                </Link>
                <p className="text-sm text-ink-muted">
                  {listing.owner.rating.toFixed(2)} rating · {listing.owner.exchanges} {t("common.exchanges")}
                </p>
              </div>
              {listing.owner.verified && (
                <span className="rounded-lg bg-brand/10 px-2 py-1 text-[11px] font-semibold text-brand-dim dark:text-brand-glow">
                  {t("common.verified")}
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          {isOwner ? (
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href={`/listing/${listing.id}/edit`}
                className="flex-1 rounded-2xl border border-black/[0.08] py-4 text-center text-sm font-semibold text-ink transition hover:border-brand/30 dark:border-white/10"
              >
                {t("listing.editTitle")}
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row">
              <motion.button
                type="button"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                disabled={status === "reserved"}
                onClick={() => setModalOpen(true)}
                className={cn(
                  "flex-1 rounded-2xl bg-brand py-4 text-center text-sm font-semibold text-white shadow-brand-soft transition",
                  "hover:bg-brand-dim disabled:cursor-not-allowed disabled:opacity-50",
                )}
              >
                {status === "reserved" ? t("common.reserved") : "Request to borrow"}
              </motion.button>
              <Link
                href="/messages"
                className="flex-1 rounded-2xl border border-black/[0.08] py-4 text-center text-sm font-semibold text-ink transition hover:border-brand/30 dark:border-white/10"
              >
                Message
              </Link>
            </div>
          )}

          <div className="flex flex-wrap gap-2 border-t border-black/[0.06] pt-6 dark:border-white/10">
            <button
              type="button"
              className="rounded-full border border-black/[0.08] px-4 py-2 text-xs font-semibold text-ink-muted transition hover:border-rose-300 hover:text-rose-600 dark:border-white/10 dark:hover:border-rose-500/40 dark:hover:text-rose-300"
              onClick={() => showToast("Report submitted (demo).")}
            >
              Report listing
            </button>
            <Link
              href="/safety"
              className="rounded-full border border-transparent px-4 py-2 text-xs font-semibold text-brand underline-offset-4 hover:underline"
            >
              Safety guidelines
            </Link>
          </div>
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[110] w-[min(90vw,420px)] -translate-x-1/2 rounded-2xl border border-black/[0.06] bg-white/95 px-4 py-3 text-center text-sm font-medium text-ink shadow-glass-lg dark:border-white/10 dark:bg-slate-900/95">
          {toast}
        </div>
      )}

      <ReservationModal
        listing={listing}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => setStatus("reserved")}
      />
    </div>
  );
}
