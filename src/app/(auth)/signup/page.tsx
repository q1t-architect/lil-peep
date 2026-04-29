"use client";

import Link from "next/link";
import { useState } from "react";
import { Logo } from "@/components/AppShell";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type FieldErrors = { name?: string; email?: string; password?: string };

function validate(name: string, email: string, password: string): FieldErrors {
  const errors: FieldErrors = {};
  if (!name.trim()) errors.name = "Name is required";
  else if (name.trim().length > 50) errors.name = "Name must be 50 characters or fewer";
  if (!email.trim()) errors.email = "Email is required";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Enter a valid email address";
  if (!password) errors.password = "Password is required";
  else if (password.length < 8) errors.password = "Password must be at least 8 characters";
  return errors;
}

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [emailExists, setEmailExists] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    setEmailExists(false);

    const errors = validate(name, email, password);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name: name.trim() } },
    });

    setLoading(false);

    if (!error) {
      setConfirmed(true);
      return;
    }

    const msg = error.message.toLowerCase();
    if (msg.includes("already registered") || msg.includes("already exists") || msg.includes("user already")) {
      setEmailExists(true);
    } else {
      setSubmitError(error.message);
    }
  }

  if (confirmed) {
    return (
      <div className="mx-auto max-w-md">
        <div className="glass glass-border rounded-[2rem] p-8 shadow-glass-lg text-center space-y-4">
          <div className="flex justify-center">
            <Logo size="md" withWordmark={false} />
          </div>
          <h2 className="font-display text-2xl font-semibold text-ink">Check your inbox</h2>
          <p className="text-sm text-ink-muted">
            We sent a confirmation email to{" "}
            <span className="font-medium text-ink">{email}</span>. Click the link inside to
            activate your account.
          </p>
          <Link href="/login" className="inline-block text-sm font-medium text-brand hover:text-brand-dim">
            Back to login →
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
          Create your account
        </h1>
        <p className="mb-6 text-center text-sm text-ink-muted">
          Join your neighborhood on Neighborly
        </p>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-ink-muted">
              Name
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                placeholder="Your full name"
                className={cn(
                  "mt-1 w-full rounded-xl border bg-white px-4 py-3 text-sm transition dark:bg-slate-900",
                  "focus:border-brand/40 focus:outline-none focus:ring-2 focus:ring-brand/20",
                  fieldErrors.name
                    ? "border-red-400 dark:border-red-500"
                    : "border-black/[0.08] dark:border-white/10",
                )}
              />
            </label>
            {fieldErrors.name && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.name}</p>
            )}
          </div>

          {/* Email */}
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
                  fieldErrors.email
                    ? "border-red-400 dark:border-red-500"
                    : "border-black/[0.08] dark:border-white/10",
                )}
              />
            </label>
            {fieldErrors.email && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.email}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-ink-muted">
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                placeholder="Min. 8 characters"
                className={cn(
                  "mt-1 w-full rounded-xl border bg-white px-4 py-3 text-sm transition dark:bg-slate-900",
                  "focus:border-brand/40 focus:outline-none focus:ring-2 focus:ring-brand/20",
                  fieldErrors.password
                    ? "border-red-400 dark:border-red-500"
                    : "border-black/[0.08] dark:border-white/10",
                )}
              />
            </label>
            {fieldErrors.password && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.password}</p>
            )}
          </div>

          {/* Errors */}
          {emailExists && (
            <p className="text-sm text-red-600 dark:text-red-400">
              This email is already registered.{" "}
              <Link href="/login" className="font-medium underline underline-offset-2">
                Log in instead?
              </Link>
            </p>
          )}
          {submitError && (
            <p className="text-sm text-red-600 dark:text-red-400">{submitError}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 flex w-full items-center justify-center rounded-2xl bg-brand py-3.5 text-sm font-semibold text-white shadow-brand-soft transition hover:bg-brand-dim disabled:opacity-60"
          >
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-ink-muted">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-brand hover:text-brand-dim">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
