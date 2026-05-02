import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getListing } from "@/lib/listings.server";
import { ListingDetailClient } from "@/components/listing/ListingDetailClient";
import type { ListingWithOwner } from "@/lib/listings.server";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  let title = "Listing";
  let description = "View this item on Neighborly — hyperlocal marketplace in Madrid.";

  try {
    const listing = await getListing(id);
    if (listing) {
      title = listing.title;
      description = listing.description?.slice(0, 160) ?? description;
    }
  } catch { /* fallback */ }

  return {
    title,
    description,
    openGraph: { title: `${title} | Neighborly`, description },
  };
}

export default async function ListingPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const listing = await getListing(id);
  if (!listing) notFound();

  return <ListingDetailClient listing={listing} currentUserId={user?.id} />;
}
