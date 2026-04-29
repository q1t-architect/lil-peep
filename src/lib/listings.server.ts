// =============================================================================
// Server-side listing queries — SERVER ONLY
// Must only be imported from Server Components or Route Handlers
// =============================================================================

import { createClient } from "@/lib/supabase/server";

// ---------------------------------------------------------------------------
// Types (shared — re-exported)
// ---------------------------------------------------------------------------

export type ListingRow = {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  category: string;
  images: string[];
  location: { x: number; y: number } | null;
  neighborhood: string | null;
  status: "available" | "reserved" | "given";
  price_type: "free" | "symbolic";
  price_euro: number | null;
  created_at: string;
  updated_at: string;
};

export type ListingOwner = {
  id: string;
  name: string;
  avatar_url: string | null;
  neighborhood: string | null;
  rating: number;
  exchanges: number;
  verified: boolean;
};

export type ListingWithOwner = ListingRow & {
  owner: ListingOwner;
  distance_km?: number;
};

// ---------------------------------------------------------------------------
// Server-side queries
// ---------------------------------------------------------------------------

export async function getListing(id: string): Promise<ListingWithOwner | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("listings")
    .select(
      `*,
       owner:profiles!listings_owner_id_fkey (
        id, name, avatar_url, neighborhood, rating, exchanges, verified
      )`
    )
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return data as unknown as ListingWithOwner;
}

export async function getNearbyListings(
  lat?: number,
  lng?: number,
  radiusKm: number = 5
): Promise<ListingWithOwner[]> {
  const supabase = await createClient();

  if (lat != null && lng != null) {
    const { data, error } = await supabase.rpc("nearby_listings", {
      lat,
      lng,
      radius_km: radiusKm,
    });

    if (error || !data) return [];

    const ownerIds = [...new Set(data.map((l: ListingRow) => l.owner_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, name, avatar_url, neighborhood, rating, exchanges, verified")
      .in("id", ownerIds);

    const profileMap = new Map<string, ListingOwner>();
    if (profiles) {
      for (const p of profiles) profileMap.set(p.id, p as ListingOwner);
    }

    return data.map((l: ListingRow & { distance_km: number }) => ({
      ...l,
      owner: profileMap.get(l.owner_id) ?? {
        id: l.owner_id, name: "Unknown", avatar_url: null,
        neighborhood: null, rating: 0, exchanges: 0, verified: false,
      },
      distance_km: l.distance_km,
    }));
  }

  const { data, error } = await supabase
    .from("listings")
    .select(
      `*,
       owner:profiles!listings_owner_id_fkey (
        id, name, avatar_url, neighborhood, rating, exchanges, verified
      )`
    )
    .eq("status", "available")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error || !data) return [];
  return data as unknown as ListingWithOwner[];
}

export async function getListingsByOwner(ownerId: string): Promise<ListingWithOwner[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("listings")
    .select(
      `*,
       owner:profiles!listings_owner_id_fkey (
        id, name, avatar_url, neighborhood, rating, exchanges, verified
      )`
    )
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data as unknown as ListingWithOwner[];
}
