import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getListing } from "@/lib/listings.server";
import { ListingFormClient } from "@/components/listing/ListingFormClient";

type Props = { params: Promise<{ id: string }> };

export default async function EditListingPage({ params }: Props) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/signin");

  const listing = await getListing(id);
  if (!listing) notFound();

  // Only the owner can edit
  if (listing.owner_id !== user.id) redirect(`/listing/${id}`);

  return <ListingFormClient userId={user.id} editing={listing} />;
}
