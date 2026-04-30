import { ListingGridSkeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <div className="space-y-3">
        <div className="h-3 w-24 animate-pulse rounded bg-ink/5" />
        <div className="h-10 w-2/3 animate-pulse rounded bg-ink/5" />
        <div className="h-5 w-1/2 animate-pulse rounded bg-ink/5" />
      </div>
      <ListingGridSkeleton count={6} />
    </div>
  );
}
