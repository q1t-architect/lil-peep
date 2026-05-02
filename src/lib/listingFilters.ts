// =============================================================================
// Neighborly MVP — Listing filters (Supabase-only)
// =============================================================================

import type { ListingWithOwner } from "@/lib/listings.server";

export type FilterState = {
  query: string;
  category: string;
  radiusKm: number;
  freeOnly: boolean;
  availability: "all" | "available" | "reserved";
  sort: "newest" | "nearest" | "rating";
};

export const defaultFilterState: FilterState = {
  query: "",
  category: "All",
  radiusKm: 5,
  freeOnly: false,
  availability: "all",
  sort: "nearest",
};

export function filterListings(listings: ListingWithOwner[], f: FilterState): ListingWithOwner[] {
  let out = [...listings];

  // Radius filter (only for listings with distance_km)
  if (f.sort === "nearest") {
    out = out.filter((l) => l.distance_km == null || l.distance_km <= f.radiusKm);
  }

  if (f.query.trim()) {
    const q = f.query.toLowerCase();
    out = out.filter(
      (l) =>
        l.title.toLowerCase().includes(q) ||
        (l.description ?? "").toLowerCase().includes(q) ||
        (l.neighborhood ?? "").toLowerCase().includes(q),
    );
  }

  if (f.category !== "All") {
    out = out.filter((l) => l.category === f.category);
  }

  if (f.freeOnly) {
    out = out.filter((l) => l.price_type === "free");
  }

  if (f.availability === "available") {
    out = out.filter((l) => l.status === "available");
  }
  if (f.availability === "reserved") {
    out = out.filter((l) => l.status === "reserved");
  }

  if (f.sort === "nearest") {
    out = [...out].sort((a, b) => (a.distance_km ?? 999) - (b.distance_km ?? 999));
  } else if (f.sort === "newest") {
    out = [...out].sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));
  } else if (f.sort === "rating") {
    out = [...out].sort((a, b) => (b.owner?.rating ?? 0) - (a.owner?.rating ?? 0));
  }

  return out;
}
