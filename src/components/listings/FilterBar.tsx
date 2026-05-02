"use client";

import { CATEGORIES } from "@/lib/constants";
import type { FilterState } from "@/lib/listingFilters";
import { useLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export type { FilterState } from "@/lib/listingFilters";

export function FilterBar({
  value,
  onChange,
}: {
  value: FilterState;
  onChange: (next: FilterState) => void;
}) {
  const { t } = useLocale();

  return (
    <div className="space-y-4">
      <div className="relative">
        <svg
          className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden
        >
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3-3" strokeLinecap="round" />
        </svg>
        <input
          type="search"
          placeholder={t("filter.searchPlaceholder")}
          value={value.query}
          onChange={(e) => onChange({ ...value, query: e.target.value })}
          className={cn(
            "w-full rounded-2xl border border-black/[0.06] bg-white/80 py-3.5 pl-11 pr-4 text-sm",
            "placeholder:text-ink-muted/80 focus:border-brand/40 focus:outline-none focus:ring-2 focus:ring-brand/20",
            "dark:border-white/10 dark:bg-slate-900/60",
          )}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {CATEGORIES.map((c) => {
          const label = t(`category.${c.toLowerCase()}` as Parameters<typeof t>[0]);
          return (
            <button
              key={c}
              type="button"
              onClick={() => onChange({ ...value, category: c })}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-xs font-semibold transition",
                value.category === c
                  ? "bg-brand text-white shadow-brand-soft-sm"
                  : "bg-black/[0.04] text-ink-muted hover:text-ink dark:bg-white/10",
              )}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-black/[0.05] bg-white/50 p-4 dark:border-white/10 dark:bg-slate-900/40 lg:flex-row lg:items-center lg:justify-between">
        <label className="flex flex-1 flex-col gap-1 text-xs font-medium text-ink-muted">
          {t("filter.radius")} · {value.radiusKm} km
          <input
            type="range"
            min={1}
            max={15}
            value={value.radiusKm}
            onChange={(e) => onChange({ ...value, radiusKm: Number(e.target.value) })}
            className="accent-brand"
          />
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <Toggle
            label={t("filter.freeOnly")}
            on={value.freeOnly}
            onToggle={() => onChange({ ...value, freeOnly: !value.freeOnly })}
          />
          <select
            value={value.availability}
            onChange={(e) =>
              onChange({
                ...value,
                availability: e.target.value as FilterState["availability"],
              })
            }
            className="rounded-xl border border-black/[0.08] bg-white px-3 py-2 text-xs font-medium dark:border-white/10 dark:bg-slate-900"
          >
            <option value="all">{t("filter.allAvailability")}</option>
            <option value="available">{t("filter.availableNow")}</option>
            <option value="reserved">{t("filter.reserved")}</option>
          </select>
          <select
            value={value.sort}
            onChange={(e) => onChange({ ...value, sort: e.target.value as FilterState["sort"] })}
            className="rounded-xl border border-black/[0.08] bg-white px-3 py-2 text-xs font-medium dark:border-white/10 dark:bg-slate-900"
          >
            <option value="nearest">{t("filter.sortNearest")}</option>
            <option value="newest">{t("filter.sortNewest")}</option>
            <option value="rating">{t("filter.sortRating")}</option>
          </select>
        </div>
      </div>
    </div>
  );
}

function Toggle({ label, on, onToggle }: { label: string; on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition",
        on
          ? "border-brand/40 bg-brand/10 text-brand-dim dark:text-brand-glow"
          : "border-black/[0.08] text-ink-muted dark:border-white/10",
      )}
    >
      <span
        className={cn(
          "relative inline-flex h-5 w-9 items-center rounded-full transition",
          on ? "bg-brand" : "bg-slate-300 dark:bg-slate-600",
        )}
      >
        <span
          className={cn(
            "inline-block h-4 w-4 rounded-full bg-white shadow transition",
            on ? "translate-x-4" : "translate-x-1",
          )}
        />
      </span>
      {label}
    </button>
  );
}
