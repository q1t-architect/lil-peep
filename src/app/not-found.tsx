import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center px-6 py-20 text-center">
      <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-brand">Neighborly</p>
      <h1 className="mt-3 font-display text-3xl font-semibold text-ink">This corner of the map is empty</h1>
      <p className="mt-3 text-sm text-ink-muted">The page you’re looking for isn’t in this prototype build.</p>
      <Link
        href="/"
        className="mt-8 rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white shadow-brand-soft-sm"
      >
        Back to home
      </Link>
    </div>
  );
}
