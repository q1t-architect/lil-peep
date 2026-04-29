import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-16 sm:px-6">
      {/* Background decorations */}
      <div className="pointer-events-none absolute inset-0 bg-hero-mesh opacity-70 dark:opacity-40" />
      <div className="pointer-events-none absolute -left-32 top-20 h-96 w-96 rounded-full bg-brand/20 blur-3xl dark:bg-brand/30" />
      <div className="pointer-events-none absolute -right-20 bottom-10 h-80 w-80 rounded-full bg-brand/15 blur-3xl" />
      <div className="relative w-full">{children}</div>
    </div>
  );
}
