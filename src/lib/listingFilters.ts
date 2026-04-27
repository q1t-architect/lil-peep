import type { Listing } from "@/lib/data";

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

export function filterListings(listings: Listing[], f: FilterState): Listing[] {
  let out = listings.filter((l) => l.distanceKm <= f.radiusKm);

  if (f.query.trim()) {
    const q = f.query.toLowerCase();
    out = out.filter(
      (l) =>
        l.title.toLowerCase().includes(q) ||
        l.description.toLowerCase().includes(q) ||
        l.neighborhood.toLowerCase().includes(q),
    );
  }

  if (f.category !== "All") {
    out = out.filter((l) => l.category === f.category);
  }

  if (f.freeOnly) {
    out = out.filter((l) => l.priceType === "free");
  }

  if (f.availability === "available") {
    out = out.filter((l) => l.status === "available");
  }
  if (f.availability === "reserved") {
    out = out.filter((l) => l.status === "reserved");
  }

  if (f.sort === "nearest") {
    out = [...out].sort((a, b) => a.distanceKm - b.distanceKm);
  } else if (f.sort === "newest") {
    out = [...out].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } else if (f.sort === "rating") {
    out = [...out].sort((a, b) => b.owner.rating - a.owner.rating);
  }

  return out;
}
