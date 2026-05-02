// =============================================================================
// Client-side review queries & mutations — BROWSER ONLY
// =============================================================================

import { createClient } from "@/lib/supabase/client";

export type ReviewRow = {
  id: string;
  listing_id: string;
  reviewer_id: string;
  reviewee_id: string;
  rating: number;
  text: string | null;
  created_at: string;
  reviewer?: {
    name: string;
    avatar_url: string | null;
  };
};

export async function getReviewsForProfile(revieweeId: string): Promise<ReviewRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("reviews")
    .select(
      `id, listing_id, reviewer_id, reviewee_id, rating, text, created_at,
       reviewer:profiles!reviews_reviewer_id_fkey(name, avatar_url)`
    )
    .eq("reviewee_id", revieweeId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to fetch reviews: ${error.message}`);
  return (data ?? []) as unknown as ReviewRow[];
}

export type CreateReviewInput = {
  listingId: string;
  revieweeId: string;
  rating: number;
  text: string;
};

export async function createReview(input: CreateReviewInput): Promise<ReviewRow> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("reviews")
    .insert({
      listing_id: input.listingId,
      reviewer_id: user.id,
      reviewee_id: input.revieweeId,
      rating: input.rating,
      text: input.text.trim() || null,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create review: ${error.message}`);
  return data as unknown as ReviewRow;
}
