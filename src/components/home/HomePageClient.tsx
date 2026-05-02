"use client";

import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { InteractiveMap } from "@/components/map/InteractiveMap";
import { FilterBar } from "@/components/listings/FilterBar";
import { ListingCard } from "@/components/listings/ListingCard";
import { WISHLIST_TAGS } from "@/lib/constants";
import { defaultFilterState, filterListings, type FilterState } from "@/lib/listingFilters";
import type { ListingWithOwner } from "@/lib/listings.server";
import { useLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type Props = {
  listings: ListingWithOwner[];
};

export function HomePageClient({ listings }: Props) {
  const [filters, setFilters] = useState<FilterState>(defaultFilterState);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { t } = useLocale();

  const filtered = useMemo(
    () => filterListings(listings, filters),
    [listings, filters],
  );

  const mapListings = useMemo(() => {
    if (!selectedId) return filtered;
    const sel = listings.find((l) => l.id === selectedId);
    if (sel && !filtered.some((l) => l.id === sel.id)) return [...filtered, sel];
    return filtered;
  }, [filtered, listings, selectedId]);

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <header className="max-w-3xl space-y-3 animate-fade-in">
        <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-brand">{t("home.eyebrow")}</p>
        <h1 className="font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
          {t("home.headline")} <span className="text-brand">{t("home.headlineAccent")}</span>{t("home.headlinePunct")}
        </h1>
        <p className="text-balance text-lg text-ink-muted">{t("home.subtitle")}</p>
      </header>

      <FilterBar value={filters} onChange={setFilters} />

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-ink">{t("home.nearYou")}</h2>
            <span className="text-xs text-ink-muted">
              {filtered.length} {t("home.listings")}
            </span>
          </div>
          <InteractiveMap
            className="h-[min(72vh,560px)] min-h-[380px] w-full"
            listings={mapListings}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </div>

        <div className="space-y-4 lg:max-h-[min(72vh,560px)] lg:overflow-y-auto lg:pr-1 lg:scrollbar-thin">
          {filtered.length === 0 ? (
            <div className="glass glass-border flex flex-col items-center justify-center rounded-3xl px-6 py-16 text-center">
              <p className="font-display text-lg font-semibold text-ink">{t("home.quietBlock")}</p>
              <p className="mt-2 max-w-sm text-sm text-ink-muted">{t("home.quietBlockSub")}</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              {filtered.map((listing, i) => (
                <ListingCard key={listing.id} listing={listing} index={i} />
              ))}
            </div>
          )}
        </div>
      </div>

      <section className="rounded-[1.75rem] border border-black/[0.05] bg-gradient-to-br from-brand/[0.07] via-white/40 to-transparent p-6 dark:border-white/10 dark:from-brand/15 dark:via-slate-900/40 dark:to-transparent">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand">
              {t("home.lookingForEyebrow")}
            </p>
            <h2 className="mt-1 font-display text-xl font-semibold text-ink">{t("home.lookingForTitle")}</h2>
            <p className="mt-2 max-w-xl text-sm text-ink-muted">{t("home.lookingForDesc")}</p>
          </div>
          <span className="shrink-0 rounded-full bg-white/80 px-3 py-1 text-[11px] font-medium text-ink-muted shadow-sm dark:bg-slate-800/80">
            {t("home.wishlistDemo")}
          </span>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {WISHLIST_TAGS.map((tag, i) => (
            <motion.span
              key={tag}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.04 }}
              className={cn(
                "cursor-default rounded-full border border-black/[0.06] bg-white/90 px-4 py-2 text-xs font-semibold text-ink",
                "shadow-sm dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-100",
              )}
            >
              {tag}
            </motion.span>
          ))}
        </div>
      </section>
    </div>
  );
}
