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
// Internal helpers
// ---------------------------------------------------------------------------

const OWNER_SELECT = `owner:profiles!listings_owner_id_fkey (
  id, name, avatar_url, neighborhood, rating, exchanges, verified
)`;

// ---------------------------------------------------------------------------
// Server-side queries
// ---------------------------------------------------------------------------

export async function getListing(id: string): Promise<ListingWithOwner | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("listings")
    .select(`*, ${OWNER_SELECT}`)
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return data as unknown as ListingWithOwner;
}

/**
 * Fetch up to `limit` available listings near a coordinate, ordered by
 * distance. Falls back to Madrid city centre when no coords are provided.
 *
 * Two-step: PostGIS RPC for IDs + distance_km, then a full JOIN query for
 * complete rows (including `location` for map pins). This preserves distance
 * ordering while giving clients both the geography coords and the km value.
 *
 * @param lat      Latitude  (default: Madrid centre 40.4168)
 * @param lng      Longitude (default: Madrid centre -3.7038)
 * @param radiusKm Fetch radius in km (default: 25 — covers all of Madrid)
 * @param limit    Max rows returned (default: 50)
 */
export async function getNearbyListings(
  lat: number = 40.4168,
  lng: number = -3.7038,
  radiusKm: number = 25,
  limit: number = 50,
): Promise<ListingWithOwner[]> {
  const supabase = await createClient();

  // Step 1: PostGIS nearby_listings RPC → IDs ordered by distance + distance_km values
  type RpcRow = { id: string; distance_km: number };
  const { data: rpcRows, error: rpcErr } = await supabase
    .rpc("nearby_listings", { lat, lng, radius_km: radiusKm })
    .limit(limit);

  if (rpcErr || !rpcRows || (rpcRows as RpcRow[]).length === 0) return [];

  const rows = rpcRows as RpcRow[];
  const ids = rows.map((r) => r.id);
  const distanceMap = new Map<string, number>(rows.map((r) => [r.id, r.distance_km]));

  // Step 2: Fetch full listing rows (with location geography + owner join) for those IDs
  const { data, error } = await supabase
    .from("listings")
    .select(`*, ${OWNER_SELECT}`)
    .in("id", ids);

  if (error || !data) return [];

  const listingMap = new Map<string, ListingWithOwner>(
    (data as unknown as ListingWithOwner[]).map((l) => [l.id, l]),
  );

  // Merge: preserve RPC distance ordering, inject distance_km into full rows
  const result: ListingWithOwner[] = [];
  for (const id of ids) {
    const listing = listingMap.get(id);
    if (!listing) continue;
    result.push({ ...listing, distance_km: distanceMap.get(id) });
  }
  return result;
}

/**
 * Fetch listings by owner, newest first, capped at `limit` rows.
 */
export async function getListingsByOwner(
  ownerId: string,
  limit: number = 20,
): Promise<ListingWithOwner[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("listings")
    .select(`*, ${OWNER_SELECT}`)
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data as unknown as ListingWithOwner[];
}
