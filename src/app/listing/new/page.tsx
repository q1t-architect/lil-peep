import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ListingFormClient } from "@/components/listing/ListingFormClient";

export default async function NewListingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return <ListingFormClient userId={user.id} />;
}
