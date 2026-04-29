// =============================================================================
// Neighborly MVP — Listing filters
// Works with both mock Listing type and DB ListingWithOwner type
// =============================================================================

import type { Listing } from "@/lib/data";
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

/** Common shape shared by mock Listing and DB ListingWithOwner */
type FilterableListing = {
  title: string;
  description?: string | null;
  category: string;
  neighborhood?: string | null;
  status: string;
  price_type: string;
  distance_km?: number;
  created_at?: string;
  createdAt?: string; // mock uses this
  owner: { rating?: number };
};

function toFilterable(l: Listing | ListingWithOwner): FilterableListing {
  // ListingWithOwner (DB) — fields already match mostly
  if ("owner_id" in l) {
    const db = l as ListingWithOwner;
    return {
      title: db.title,
      description: db.description,
      category: db.category,
      neighborhood: db.neighborhood,
      status: db.status,
      price_type: db.price_type,
      distance_km: db.distance_km,
      created_at: db.created_at,
      owner: { rating: db.owner?.rating },
    };
  }
  // Mock Listing
  const mock = l as Listing;
  return {
    title: mock.title,
    description: mock.description,
    category: mock.category,
    neighborhood: mock.neighborhood,
    status: mock.status,
    price_type: mock.priceType,
    distance_km: mock.distanceKm,
    createdAt: mock.createdAt,
    owner: { rating: mock.owner?.rating },
  };
}

export function filterListings(listings: (Listing | ListingWithOwner)[], f: FilterState): (Listing | ListingWithOwner)[] {
  let out = [...listings];

  // Radius filter (only for listings with distance_km)
  if (f.sort === "nearest") {
    out = out.filter((l) => {
      const d = toFilterable(l).distance_km;
      return d == null || d <= f.radiusKm;
    });
  }

  if (f.query.trim()) {
    const q = f.query.toLowerCase();
    out = out.filter((l) => {
      const fl = toFilterable(l);
      return (
        fl.title.toLowerCase().includes(q) ||
        (fl.description ?? "").toLowerCase().includes(q) ||
        (fl.neighborhood ?? "").toLowerCase().includes(q)
      );
    });
  }

  if (f.category !== "All") {
    out = out.filter((l) => toFilterable(l).category === f.category);
  }

  if (f.freeOnly) {
    out = out.filter((l) => toFilterable(l).price_type === "free");
  }

  if (f.availability === "available") {
    out = out.filter((l) => toFilterable(l).status === "available");
  }
  if (f.availability === "reserved") {
    out = out.filter((l) => toFilterable(l).status === "reserved");
  }

  if (f.sort === "nearest") {
    out = [...out].sort((a, b) => {
      const da = toFilterable(a).distance_km ?? 999;
      const db = toFilterable(b).distance_km ?? 999;
      return da - db;
    });
  } else if (f.sort === "newest") {
    out = [...out].sort((a, b) => {
      const ca = toFilterable(a).created_at ?? toFilterable(a).createdAt ?? "";
      const cb = toFilterable(b).created_at ?? toFilterable(b).createdAt ?? "";
      return cb.localeCompare(ca);
    });
  } else if (f.sort === "rating") {
    out = [...out].sort((a, b) => {
      const ra = toFilterable(a).owner.rating ?? 0;
      const rb = toFilterable(b).owner.rating ?? 0;
      return rb - ra;
    });
  }

  return out;
}
