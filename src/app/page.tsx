import type { Metadata } from "next";
import { getNearbyListings } from "@/lib/listings.server";
import { HomePageClient } from "@/components/home/HomePageClient";

export const metadata: Metadata = {
  title: "Neighborly — Map-first local marketplace in Madrid",
  description: "Discover free items near you in Madrid. Borrow, lend, and give things to neighbors on an interactive map.",
  openGraph: {
    title: "Neighborly — Map-first local marketplace in Madrid",
    description: "Discover free items near you in Madrid. Borrow, lend, and give things to neighbors.",
  },
};

export default async function HomePage() {
  const listings = await getNearbyListings();
  return <HomePageClient listings={listings} />;
}
