import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfileViewClient } from "@/components/profile/ProfileViewClient";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, name, avatar_url, neighborhood, bio, rating, exchanges")
    .eq("id", user.id)
    .single();

  const { data: listings } = await supabase
    .from("listings")
    .select("id, title, category, status, price_type, price_euro, images, created_at")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10);

  const { data: reviews } = await supabase
    .from("reviews")
    .select(
      `id, listing_id, reviewer_id, reviewee_id, rating, text, created_at,
       reviewer:profiles!reviews_reviewer_id_fkey(name, avatar_url)`
    )
    .eq("reviewee_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <ProfileViewClient
      profile={
        profile ?? {
          id: user.id,
          name: user.email?.split("@")[0] ?? "You",
          avatar_url: null,
          neighborhood: null,
          bio: null,
          rating: 0,
          exchanges: 0,
        }
      }
      email={user.email ?? ""}
      listings={listings ?? []}
      reviews={(reviews ?? []) as unknown as import("@/lib/reviews.client").ReviewRow[]}
      currentUserId={user.id}
    />
  );
}
