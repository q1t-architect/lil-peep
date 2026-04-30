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

  return (
    <ProfileClient
      profile={profile}
      listings={listings ?? []}
    />
  );
}
