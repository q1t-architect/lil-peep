"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { createReview, type ReviewRow } from "@/lib/reviews.client";
import { cn } from "@/lib/utils";

export function ReviewForm({
  listingId,
  revieweeId,
  onSuccess,
}: {
  listingId: string;
  revieweeId: string;
  onSuccess?: (review: ReviewRow) => void;
}) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating === 0) {
      setError("Please select a rating");
      return;
    }
    setError(null);
    setSubmitting(true);

    try {
      const review = await createReview({ listingId, revieweeId, rating, text });
      setRating(0);
      setText("");
      onSuccess?.(review);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-black/[0.06] bg-white/60 p-5 dark:border-white/10 dark:bg-slate-900/50"
    >
      <p className="text-sm font-semibold text-ink">Leave a review</p>
      <p className="mt-1 text-xs text-ink-muted">Share your experience with this neighbor.</p>

      <div className="mt-3 flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((s) => (
          <button
            key={s}
            type="button"
            onMouseEnter={() => setHoverRating(s)}
            onMouseLeave={() => setHoverRating(0)}
            onClick={() => setRating(s)}
            className="p-0.5 transition hover:scale-110"
          >
            <svg
              className={cn(
                "h-6 w-6",
                s <= (hoverRating || rating)
                  ? "text-amber-400"
                  : "text-slate-300 dark:text-slate-600",
              )}
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </button>
        ))}
        <span className="ml-1 text-xs text-ink-muted">{rating > 0 ? `${rating}/5` : ""}</span>
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={500}
        rows={3}
        placeholder="What went well?"
        className="mt-3 w-full rounded-xl border border-black/[0.08] bg-white/80 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 dark:border-white/10 dark:bg-slate-900/80 resize-none"
      />
      <p className="mt-1 text-right text-[11px] text-ink-muted">{text.length}/500</p>

      {error && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-2 text-xs text-red-600 dark:text-red-400"
        >
          {error}
        </motion.p>
      )}

      <button
        type="submit"
        disabled={submitting || rating === 0}
        className="mt-3 inline-flex items-center justify-center rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white shadow-brand-soft-sm transition hover:bg-brand-dim disabled:opacity-50"
      >
        {submitting ? "Submitting…" : "Submit review"}
      </button>
    </form>
  );
}
