import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfileClient } from "@/components/profile/ProfileClient";

type Props = { params: Promise<{ id: string }> };

export default async function ProfileByIdPage({ params }: Props) {
  const { id } = await params;

  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, name, avatar_url, neighborhood, bio, rating, exchanges")
    .eq("id", id)
    .single();

  if (!profile) notFound();

  const { data: listings } = await supabase
    .from("listings")
    .select("id, title, category, status, price_type, price_euro, images, created_at")
    .eq("owner_id", id)
    .order("created_at", { ascending: false })
    .limit(10);

  const { data: reviews } = await supabase
    .from("reviews")
    .select(
      `id, listing_id, reviewer_id, reviewee_id, rating, text, created_at,
       reviewer:profiles!reviews_reviewer_id_fkey(name, avatar_url)`
    )
    .eq("reviewee_id", id)
    .order("created_at", { ascending: false });

  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  let canReview = false;
  let reviewListingId: string | undefined;

  if (currentUser && currentUser.id !== id) {
    const { data: resData } = await supabase
      .from("reservations")
      .select("listing_id")
      .or(`borrower_id.eq.${currentUser.id},owner_id.eq.${currentUser.id}`)
      .or(`borrower_id.eq.${id},owner_id.eq.${id}`)
      .limit(1);

    if (resData && resData.length > 0) {
      canReview = true;
      reviewListingId = resData[0].listing_id;
    }
  }

  return (
    <ProfileClient
      profile={profile}
      listings={listings ?? []}
      reviews={(reviews ?? []) as unknown as import("@/lib/reviews.client").ReviewRow[]}
      currentUserId={currentUser?.id}
      canReview={canReview}
      reviewListingId={reviewListingId}
    />
  );
}
