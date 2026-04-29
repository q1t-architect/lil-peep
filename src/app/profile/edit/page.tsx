import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfileEditClient } from "@/components/profile/ProfileEditClient";

export default async function ProfileEditPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, name, avatar_url, neighborhood, bio")
    .eq("id", user.id)
    .single();

  return (
    <ProfileEditClient
      profile={
        profile ?? {
          id: user.id,
          name: user.email?.split("@")[0] ?? "",
          avatar_url: null,
          neighborhood: null,
          bio: null,
        }
      }
    />
  );
}
