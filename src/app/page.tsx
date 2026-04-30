import type { Metadata } from "next";
import { HomePageClient } from "@/components/home/HomePageClient";

export const metadata: Metadata = {
  title: "Neighborly — Map-first local marketplace in Madrid",
  description: "Discover free items near you in Madrid. Borrow, lend, and give things to neighbors on an interactive map.",
  openGraph: {
    title: "Neighborly — Map-first local marketplace in Madrid",
    description: "Discover free items near you in Madrid. Borrow, lend, and give things to neighbors.",
  },
};

export default function HomePage() {
  return <HomePageClient />;
}
