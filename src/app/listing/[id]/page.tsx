import { notFound } from "next/navigation";
import { ListingDetailClient } from "@/components/listing/ListingDetailClient";
import { MOCK_LISTINGS } from "@/lib/data";

type Props = { params: Promise<{ id: string }> };

export default async function ListingPage({ params }: Props) {
  const { id } = await params;
  const listing = MOCK_LISTINGS.find((l) => l.id === id);
  if (!listing) notFound();
  return <ListingDetailClient listing={listing} />;
}
