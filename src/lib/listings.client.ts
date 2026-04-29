// =============================================================================
// Client-side listing mutations — BROWSER ONLY
// Uses supabase/client — safe to import from "use client" components
// =============================================================================

import { createClient } from "@/lib/supabase/client";

// Re-export types from server module for convenience
export type { ListingRow, ListingOwner, ListingWithOwner } from "./listings.server";

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export type CreateListingInput = {
  title: string;
  description: string;
  category: string;
  neighborhood: string;
  price_type: "free" | "symbolic";
  price_euro?: number;
  lat: number;
  lng: number;
  images: string[];
};

export async function createListing(input: CreateListingInput): Promise<{ id: string } | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("listings")
    .insert({
      owner_id: user.id,
      title: input.title,
      description: input.description,
      category: input.category,
      neighborhood: input.neighborhood,
      price_type: input.price_type,
      price_euro: input.price_euro ?? null,
      images: input.images,
      location: `POINT(${input.lng} ${input.lat})`,
    })
    .select("id")
    .single();

  if (error) throw new Error(`Failed to create listing: ${error.message}`);
  return data;
}

export type UpdateListingInput = Partial<CreateListingInput> & {
  id: string;
  status?: "available" | "reserved" | "given";
};

export async function updateListing(input: UpdateListingInput): Promise<boolean> {
  const supabase = createClient();
  const updateData: Record<string, unknown> = {};

  if (input.title !== undefined) updateData.title = input.title;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.category !== undefined) updateData.category = input.category;
  if (input.neighborhood !== undefined) updateData.neighborhood = input.neighborhood;
  if (input.price_type !== undefined) updateData.price_type = input.price_type;
  if (input.price_euro !== undefined) updateData.price_euro = input.price_euro;
  if (input.images !== undefined) updateData.images = input.images;
  if (input.status !== undefined) updateData.status = input.status;
  if (input.lat !== undefined && input.lng !== undefined) {
    updateData.location = `POINT(${input.lng} ${input.lat})`;
  }

  const { error } = await supabase
    .from("listings")
    .update(updateData)
    .eq("id", input.id);

  if (error) throw new Error(`Failed to update listing: ${error.message}`);
  return true;
}

export async function deleteListing(listingId: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from("listings")
    .delete()
    .eq("id", listingId);

  if (error) throw new Error(`Failed to delete listing: ${error.message}`);
  return true;
}
