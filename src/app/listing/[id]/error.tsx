"use client";

export default function ListingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <span className="text-5xl">📍</span>
      <h2 className="font-display text-2xl font-semibold text-ink">Listing not available</h2>
      <p className="max-w-md text-sm text-ink-muted">
        {error.message || "This listing could not be loaded. It may have been removed."}
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-2 rounded-full border border-brand/30 px-5 py-2 text-sm font-semibold text-brand transition hover:bg-brand/5"
      >
        Try again
      </button>
    </div>
  );
}
