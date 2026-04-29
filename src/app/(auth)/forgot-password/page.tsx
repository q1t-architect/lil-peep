"use client";

import Link from "next/link";
import { useState } from "react";
import { Logo } from "@/components/AppShell";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEmailError("");
    setSubmitError(null);

    if (!email.trim()) {
      setEmailError("Email is required");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError("Enter a valid email address");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/confirm`,
    });
    setLoading(false);

    if (error) {
      setSubmitError("Unable to send reset link. Try again.");
      return;
    }

    setSent(true);
  }

  if (sent) {
    return (
      <div className="mx-auto max-w-md">
        <div className="glass glass-border rounded-[2rem] p-8 shadow-glass-lg text-center space-y-4">
          <div className="flex justify-center">
            <Logo size="md" withWordmark={false} />
          </div>
          <h2 className="font-display text-2xl font-semibold text-ink">Check your inbox</h2>
          <p className="text-sm text-ink-muted">
            Reset link sent to{" "}
            <span className="font-medium text-ink">{email}</span>. Follow the link to set a new
            password.
          </p>
          <Link href="/login" className="inline-block text-sm font-medium text-brand hover:text-brand-dim">
            ← Back to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="glass glass-border rounded-[2rem] p-8 shadow-glass-lg">
        <div className="mb-6 flex justify-center">
          <Logo size="lg" />
        </div>
        <h1 className="mb-1 text-center font-display text-2xl font-semibold text-ink">
          Reset your password
        </h1>
        <p className="mb-6 text-center text-sm text-ink-muted">
          We&apos;ll send a reset link to your email
        </p>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-ink-muted">
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                placeholder="you@example.com"
                className={cn(
                  "mt-1 w-full rounded-xl border bg-white px-4 py-3 text-sm transition dark:bg-slate-900",
                  "focus:border-brand/40 focus:outline-none focus:ring-2 focus:ring-brand/20",
                  emailError
                    ? "border-red-400 dark:border-red-500"
                    : "border-black/[0.08] dark:border-white/10",
                )}
              />
            </label>
            {emailError && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{emailError}</p>
            )}
          </div>

          {submitError && (
            <p className="text-sm text-red-600 dark:text-red-400">{submitError}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 flex w-full items-center justify-center rounded-2xl bg-brand py-3.5 text-sm font-semibold text-white shadow-brand-soft transition hover:bg-brand-dim disabled:opacity-60"
          >
            {loading ? "Sending…" : "Send reset link"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-ink-muted">
          <Link href="/login" className="font-medium text-brand hover:text-brand-dim">
            ← Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
