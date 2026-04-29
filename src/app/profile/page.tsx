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

  // Fetch user's real listings
  const { data: listings } = await supabase
    .from("listings")
    .select("id, title, category, status, price_type, price_euro, images, created_at")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10);

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
    />
  );
}
