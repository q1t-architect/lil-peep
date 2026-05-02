"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type ReportTargetType = "profile" | "listing" | "message";

const REASONS = [
  { value: "spam", label: "Spam" },
  { value: "inappropriate", label: "Inappropriate content" },
  { value: "scam", label: "Scam or fraud" },
  { value: "harassment", label: "Harassment" },
  { value: "illegal", label: "Illegal goods or services" },
  { value: "other", label: "Other" },
];

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: ReportTargetType;
  targetId: string;
  targetOwnerId?: string;
}

export function ReportModal({ isOpen, onClose, targetType, targetId, targetOwnerId }: ReportModalProps) {
  const [reason, setReason] = useState<string>("");
  const [details, setDetails] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason) return;
    setSubmitting(true);
    setError(null);

    const supabase = createClient();
    const { error: insertError } = await supabase.from("reports").insert({
      reporter_id: (await supabase.auth.getUser()).data.user?.id,
      target_type: targetType,
      target_id: targetId,
      target_owner_id: targetOwnerId,
      reason,
      details: details.trim() || null,
    });

    setSubmitting(false);
    if (insertError) {
      setError(insertError.message);
    } else {
      setDone(true);
    }
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[1.75rem] border border-black/[0.06] bg-white p-6 shadow-glass-lg dark:border-white/10 dark:bg-slate-900">
        {done ? (
          <div className="text-center">
            <div className="mb-3 flex justify-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400">
                ✓
              </div>
            </div>
            <h3 className="font-display text-lg font-semibold text-ink">Report submitted</h3>
            <p className="mt-2 text-sm text-ink-muted">
              Thank you for helping keep Neighborly safe. Our team will review it shortly.
            </p>
            <button
              type="button"
              onClick={() => { setDone(false); onClose(); }}
              className="mt-5 inline-flex rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-brand-soft-sm"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <h3 className="font-display text-lg font-semibold text-ink">Report {targetType}</h3>
            <p className="text-sm text-ink-muted">
              This report is anonymous to the person being reported.
            </p>

            <div className="space-y-2">
              {REASONS.map((r) => (
                <label
                  key={r.value}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition",
                    reason === r.value
                      ? "border-brand bg-brand/5"
                      : "border-black/[0.06] hover:border-brand/30 dark:border-white/10",
                  )}
                >
                  <input
                    type="radio"
                    name="reason"
                    value={r.value}
                    checked={reason === r.value}
                    onChange={() => setReason(r.value)}
                    className="h-4 w-4 accent-brand"
                  />
                  <span className="text-sm font-medium text-ink">{r.label}</span>
                </label>
              ))}
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-ink-muted">
                Details (optional)
              </label>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                rows={3}
                placeholder="What happened?"
                className="w-full rounded-xl border border-black/[0.08] bg-white px-3 py-2 text-sm focus:border-brand/40 focus:outline-none focus:ring-2 focus:ring-brand/20 dark:border-white/10 dark:bg-slate-900"
              />
            </div>

            {error && <p className="text-sm text-rose-500">{error}</p>}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-2xl border border-black/[0.08] py-3 text-sm font-semibold text-ink transition hover:border-brand/30 dark:border-white/10"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!reason || submitting}
                className="flex-1 rounded-2xl bg-brand py-3 text-sm font-semibold text-white shadow-brand-soft transition hover:bg-brand-dim disabled:opacity-60"
              >
                {submitting ? "Sending…" : "Submit report"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
