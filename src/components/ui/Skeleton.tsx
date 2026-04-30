import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-xl bg-ink/5 dark:bg-white/5", className)}
    />
  );
}

export function ListingCardSkeleton() {
  return (
    <div className="rounded-2xl border border-black/[0.05] bg-white p-3 dark:border-white/10 dark:bg-slate-900/40">
      <Skeleton className="aspect-[4/3] w-full rounded-xl" />
      <div className="mt-3 space-y-2 px-1">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <div className="flex items-center gap-2 pt-1">
          <Skeleton className="h-6 w-6 rounded-full" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
    </div>
  );
}

export function ListingDetailSkeleton() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <Skeleton className="aspect-[16/9] w-full rounded-2xl" />
      <div className="mt-6 space-y-3">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-20 w-full" />
        <div className="flex items-center gap-3 pt-2">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-16" />
        </div>
      </div>
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex items-center gap-5">
        <Skeleton className="h-20 w-20 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-3 w-40" />
        </div>
      </div>
      <Skeleton className="mt-6 h-16 w-full" />
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

export function NotificationSkeleton() {
  return (
    <div className="flex gap-4 rounded-2xl border border-black/[0.05] bg-white/50 px-4 py-4 dark:border-white/10 dark:bg-slate-900/40">
      <Skeleton className="h-11 w-11 shrink-0 rounded-2xl" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
}

export function NotificationsListSkeleton() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-8 w-64" />
        </div>
        <Skeleton className="h-9 w-28 rounded-full" />
      </div>
      <div className="mt-8 space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <NotificationSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export function MessageSkeleton() {
  return (
    <div className="flex gap-3 px-4 py-3">
      <Skeleton className="h-11 w-11 shrink-0 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-full" />
      </div>
      <Skeleton className="h-3 w-10 shrink-0 self-center" />
    </div>
  );
}

export function MessagesSkeleton() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
      <Skeleton className="h-8 w-40" />
      <div className="mt-6 divide-y divide-black/5 dark:divide-white/10">
        {Array.from({ length: 5 }).map((_, i) => (
          <MessageSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export function ListingGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <ListingCardSkeleton key={i} />
      ))}
    </div>
  );
}
