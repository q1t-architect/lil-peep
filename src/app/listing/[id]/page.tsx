import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getListing } from "@/lib/listings.server";
import { ListingDetailClient } from "@/components/listing/ListingDetailClient";
import { MOCK_LISTINGS } from "@/lib/data";
import type { ListingWithOwner } from "@/lib/listings.server";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  let title = "Listing";
  let description = "View this item on Neighborly — hyperlocal marketplace in Madrid.";

  try {
    const listing = await getListing(id);
    if (listing) {
      title = listing.title;
      description = listing.description?.slice(0, 160) ?? description;
    }
  } catch { /* fallback */ }

  return {
    title,
    description,
    openGraph: { title: `${title} | Neighborly`, description },
  };
}

/**
 * Try Supabase first. If DB is unreachable (invalid key, no table, etc.)
 * fall back to mock data so the prototype still works.
 */
async function resolveListing(id: string): Promise<ListingWithOwner | null> {
  try {
    const dbListing = await getListing(id);
    if (dbListing) return dbListing;
  } catch {
    // DB not available — fall through to mock
  }

  // Fallback: find in mock data and adapt shape
  const mock = MOCK_LISTINGS.find((l) => l.id === id);
  if (!mock) return null;

  return {
    id: mock.id,
    owner_id: mock.owner.id,
    title: mock.title,
    description: mock.description,
    category: mock.category,
    images: mock.images,
    location: mock.mapX && mock.mapY ? { x: mock.mapX, y: mock.mapY } : null,
    neighborhood: mock.neighborhood,
    status: mock.status === "reserved" ? "reserved" : "available",
    price_type: mock.priceType,
    price_euro: mock.priceEuro ?? null,
    created_at: mock.createdAt,
    updated_at: mock.createdAt,
    owner: {
      id: mock.owner.id,
      name: mock.owner.name,
      avatar_url: mock.owner.avatar,
      neighborhood: mock.neighborhood,
      rating: mock.owner.rating,
      exchanges: mock.owner.exchanges,
      verified: mock.owner.verified,
    },
    distance_km: mock.distanceKm,
  };
}

export default async function ListingPage({ params }: Props) {
  const { id } = await params;
  const listing = await resolveListing(id);
  if (!listing) notFound();

  return <ListingDetailClient listing={listing} />;
}
