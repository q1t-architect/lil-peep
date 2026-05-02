"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { ReviewRow } from "@/lib/reviews.client";

export function ReviewList({ reviews }: { reviews: ReviewRow[] }) {
  if (reviews.length === 0) {
    return (
      <div className="rounded-2xl border border-black/[0.05] bg-white/40 p-6 text-center dark:border-white/10 dark:bg-slate-900/30">
        <p className="text-sm text-ink-muted">No reviews yet.</p>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {reviews.map((r, i) => (
        <motion.li
          key={r.id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.04 }}
          className="rounded-2xl border border-black/[0.05] bg-white/60 p-4 dark:border-white/10 dark:bg-slate-900/50"
        >
          <div className="flex items-start gap-3">
            <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-brand/10">
              {r.reviewer?.avatar_url ? (
                <Image
                  src={r.reviewer.avatar_url}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="40px"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-sm font-bold text-brand">
                  {r.reviewer?.name?.charAt(0) ?? "?"}
                </span>
              )}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-ink">
                  {r.reviewer?.name ?? "User"}
                </span>
                <StarRating rating={r.rating} />
                <span className="text-[11px] text-ink-muted/70">
                  {new Date(r.created_at).toLocaleDateString()}
                </span>
              </div>
              {r.text && <p className="mt-1 text-sm leading-relaxed text-ink-muted">{r.text}</p>}
            </div>
          </div>
        </motion.li>
      ))}
    </ul>
  );
}

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <svg
          key={s}
          className={cn(
            "h-3.5 w-3.5",
            s <= rating ? "text-amber-400" : "text-slate-300 dark:text-slate-600",
          )}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </span>
  );
}
