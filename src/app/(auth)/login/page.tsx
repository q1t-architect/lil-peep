"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Logo } from "@/components/AppShell";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type ErrorKind = "invalid_credentials" | "unconfirmed" | "network" | "other";

function classifyError(message: string): ErrorKind {
  const m = message.toLowerCase();
  if (m.includes("invalid login") || m.includes("invalid credentials") || m.includes("email not found")) {
    return "invalid_credentials";
  }
  if (m.includes("email not confirmed") || m.includes("not confirmed")) {
    return "unconfirmed";
  }
  if (m.includes("network") || m.includes("fetch")) {
    return "network";
  }
  return "other";
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [errorKind, setErrorKind] = useState<ErrorKind | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSent, setResendSent] = useState(false);

  function validate(): boolean {
    let ok = true;
    setEmailError("");
    setPasswordError("");
    if (!email.trim()) { setEmailError("Email is required"); ok = false; }
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setEmailError("Enter a valid email"); ok = false; }
    if (!password) { setPasswordError("Password is required"); ok = false; }
    return ok;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorKind(null);
    setErrorMessage(null);
    if (!validate()) return;

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (!error) {
      router.push(redirectTo.startsWith("/") ? redirectTo : "/");
      router.refresh();
      return;
    }

    const kind = classifyError(error.message);
    setErrorKind(kind);
    if (kind === "other") setErrorMessage(error.message);
  }

  async function handleResend() {
    setResendLoading(true);
    const supabase = createClient();
    await supabase.auth.resend({ type: "signup", email });
    setResendLoading(false);
    setResendSent(true);
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="glass glass-border rounded-[2rem] p-8 shadow-glass-lg">
        <div className="mb-6 flex justify-center">
          <Logo size="lg" />
        </div>
        <h1 className="mb-1 text-center font-display text-2xl font-semibold text-ink">
          Welcome back
        </h1>
        <p className="mb-6 text-center text-sm text-ink-muted">
          Sign in to your Neighborly account
        </p>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
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

          {/* Password */}
          <div>
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                Password
              </span>
              <Link
                href="/forgot-password"
                className="text-xs font-medium text-brand hover:text-brand-dim"
              >
                Forgot password?
              </Link>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="Your password"
              className={cn(
                "mt-1 w-full rounded-xl border bg-white px-4 py-3 text-sm transition dark:bg-slate-900",
                "focus:border-brand/40 focus:outline-none focus:ring-2 focus:ring-brand/20",
                passwordError
                  ? "border-red-400 dark:border-red-500"
                  : "border-black/[0.08] dark:border-white/10",
              )}
            />
            {passwordError && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{passwordError}</p>
            )}
          </div>

          {/* Submit errors */}
          {errorKind === "invalid_credentials" && (
            <p className="text-sm text-red-600 dark:text-red-400">Invalid email or password.</p>
          )}
          {errorKind === "unconfirmed" && (
            <div className="space-y-1">
              <p className="text-sm text-red-600 dark:text-red-400">
                Please confirm your email first.
              </p>
              {resendSent ? (
                <p className="text-xs text-ink-muted">Confirmation email resent.</p>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendLoading}
                  className="text-xs font-medium text-brand hover:text-brand-dim disabled:opacity-60"
                >
                  {resendLoading ? "Sending…" : "Resend confirmation email"}
                </button>
              )}
            </div>
          )}
          {errorKind === "network" && (
            <p className="text-sm text-red-600 dark:text-red-400">
              Network error. Check your connection.
            </p>
          )}
          {errorKind === "other" && errorMessage && (
            <p className="text-sm text-red-600 dark:text-red-400">{errorMessage}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 flex w-full items-center justify-center rounded-2xl bg-brand py-3.5 text-sm font-semibold text-white shadow-brand-soft transition hover:bg-brand-dim disabled:opacity-60"
          >
            {loading ? "Logging in…" : "Log in"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-ink-muted">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-medium text-brand hover:text-brand-dim">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-md">
          <div className="glass glass-border rounded-[2rem] p-8 shadow-glass-lg animate-pulse h-96" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
