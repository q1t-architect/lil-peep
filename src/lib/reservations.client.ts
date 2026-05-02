// =============================================================================
// Client-side reservation mutations — BROWSER ONLY
// =============================================================================

import { createClient } from "@/lib/supabase/client";

export type ReservationMode = "borrow" | "reserve";

export type ReservationResult = {
  id: string;
  pickup_code: string;
  status: string;
};

export async function createReservation(
  listingId: string,
  mode: ReservationMode,
): Promise<ReservationResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const pickupCode = randomCode();

  const { data, error } = await supabase.rpc("create_reservation", {
    p_listing_id: listingId,
    p_borrower_id: user.id,
    p_mode: mode,
    p_pickup_code: pickupCode,
  });

  if (error) throw new Error(`Failed to create reservation: ${error.message}`);
  return data as unknown as ReservationResult;
}

function randomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "NLB-";
  for (let i = 0; i < 4; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}
