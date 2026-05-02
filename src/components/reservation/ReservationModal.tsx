"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import type { ListingWithOwner } from "@/lib/listings.server";
import { createReservation, type ReservationMode } from "@/lib/reservations.client";
import { cn } from "@/lib/utils";

type Step = 0 | 1 | 2 | 3;

export function ReservationModal({
  listing,
  open,
  onClose,
  onSuccess,
}: {
  listing: ListingWithOwner | null;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const [step, setStep] = useState<Step>(0);
  const [mode, setMode] = useState<ReservationMode>("borrow");
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setMode("borrow");
    setCode("");
    setError(null);
    setSubmitting(false);
  }, [open, listing?.id]);

  const fee = useMemo(() => {
    if (!listing) return 0.05;
    if (listing.price_type === "free") return 0.05;
    return 0.5;
  }, [listing]);

  const handleClose = () => {
    setStep(0);
    setMode("borrow");
    setCode("");
    setError(null);
    setSubmitting(false);
    onClose();
  };

  async function handleConfirm() {
    if (!listing) return;
    setSubmitting(true);
    setError(null);

    try {
      const result = await createReservation(listing.id, mode);
      setCode(result.pickup_code);
      setStep(3);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  if (!listing) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm"
            aria-label="Close"
            onClick={handleClose}
          />
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className={cn(
              "relative z-[1] w-full max-w-lg overflow-hidden rounded-t-[2rem] sm:rounded-[2rem]",
              "glass glass-border shadow-glass-lg",
            )}
          >
            <div className="border-b border-black/[0.05] px-6 py-4 dark:border-white/10">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand">
                Neighborly · Trust-first handoff
              </p>
              <h2 className="mt-1 font-display text-xl font-semibold text-ink">{listing.title}</h2>
              <p className="mt-1 text-sm text-ink-muted">
                {listing.neighborhood ?? ""} · symbolic service fee
              </p>
            </div>

            <div className="space-y-6 px-6 py-6">
              {step === 0 && (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-ink">How would you like to proceed?</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <ChoiceCard
                      title="Request to borrow"
                      subtitle="Short-term, return expected"
                      selected={mode === "borrow"}
                      onClick={() => setMode("borrow")}
                    />
                    <ChoiceCard
                      title="Reserve item"
                      subtitle="Hold for pickup window"
                      selected={mode === "reserve"}
                      onClick={() => setMode("reserve")}
                    />
                  </div>
                  <button
                    type="button"
                    className="w-full rounded-2xl bg-brand py-3.5 text-sm font-semibold text-white shadow-brand-soft transition hover:bg-brand-dim"
                    onClick={() => setStep(1)}
                  >
                    Continue
                  </button>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-black/[0.06] bg-white/60 p-4 dark:border-white/10 dark:bg-slate-900/50">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-ink-muted">Symbolic platform fee</span>
                      <span className="font-semibold text-ink">€{fee.toFixed(2)}</span>
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-ink-muted">
                      Keeps Neighborly sustainable while staying symbolic — like a stamp on a postcard.
                      No shipping, no hidden fees. Pickup only.
                    </p>
                  </div>
                  <ul className="space-y-2 text-sm text-ink-muted">
                    <li className="flex gap-2">
                      <span className="text-brand">✓</span> Owner sees your{" "}
                      {mode === "borrow" ? "borrow" : "reservation"} request instantly
                    </li>
                    <li className="flex gap-2">
                      <span className="text-brand">✓</span> Chat opens to arrange a safe public handoff
                    </li>
                    <li className="flex gap-2">
                      <span className="text-brand">✓</span> Pickup code generated for both parties
                    </li>
                  </ul>
                  <button
                    type="button"
                    className="w-full rounded-2xl bg-brand py-3.5 text-sm font-semibold text-white shadow-brand-soft transition hover:bg-brand-dim"
                    onClick={() => setStep(2)}
                  >
                    Review &amp; confirm
                  </button>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <p className="text-sm text-ink-muted">
                    You&apos;re confirming a{" "}
                    <span className="font-semibold text-ink">
                      {mode === "borrow" ? "borrow request" : "reservation"}
                    </span>{" "}
                    with <span className="font-semibold text-ink">{listing.owner?.name ?? "Unknown"}</span>.
                  </p>
                  {error && (
                    <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-400">
                      {error}
                    </p>
                  )}
                  <button
                    type="button"
                    disabled={submitting}
                    className="w-full rounded-2xl bg-brand py-3.5 text-sm font-semibold text-white shadow-brand-soft transition hover:bg-brand-dim disabled:opacity-60"
                    onClick={handleConfirm}
                  >
                    {submitting ? "Processing…" : `Confirm · €${fee.toFixed(2)}`}
                  </button>
                  <button
                    type="button"
                    className="w-full text-sm text-ink-muted underline-offset-4 hover:underline"
                    onClick={() => setStep(1)}
                  >
                    Back
                  </button>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-5 text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 text-3xl">
                    ✓
                  </div>
                  <div>
                    <p className="font-display text-2xl font-semibold text-ink">You&apos;re set on Neighborly</p>
                    <p className="mt-2 text-sm text-ink-muted">
                      Show this pickup verification code when you meet. Owner has a matching token in their notifications.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-dashed border-brand/35 bg-brand/5 px-4 py-6 dark:bg-brand/10">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-brand">Pickup code</p>
                    <p className="mt-2 font-mono text-3xl font-bold tracking-[0.25em] text-ink">{code}</p>
                  </div>
                  <button
                    type="button"
                    className="w-full rounded-2xl bg-ink py-3.5 text-sm font-semibold text-white dark:bg-white dark:text-slate-900"
                    onClick={handleClose}
                  >
                    Done
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ChoiceCard({
  title,
  subtitle,
  selected,
  onClick,
}: {
  title: string;
  subtitle: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-2xl border px-4 py-4 text-left transition",
        selected
          ? "border-brand/50 bg-brand/10 shadow-brand-soft-sm"
          : "border-black/[0.08] bg-white/50 hover:border-brand/25 dark:border-white/10 dark:bg-slate-900/40",
      )}
    >
      <p className="text-sm font-semibold text-ink">{title}</p>
      <p className="mt-1 text-xs text-ink-muted">{subtitle}</p>
    </button>
  );
}
