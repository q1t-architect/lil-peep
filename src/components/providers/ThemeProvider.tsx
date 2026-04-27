"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

type Theme = "light" | "dark";

type ThemeContextValue = {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggle: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);
const STORAGE_KEY = "neighborly-theme";

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem(STORAGE_KEY) as Theme | null;
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setThemeState(getInitialTheme());
  }, []);

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.classList.toggle("dark", theme === "dark");
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme, mounted]);

  const setTheme = useCallback((t: Theme) => setThemeState(t), []);
  const toggle = useCallback(() => setThemeState((prev) => (prev === "light" ? "dark" : "light")), []);

  const value = useMemo(() => ({ theme, setTheme, toggle }), [theme, setTheme, toggle]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

function IconSun({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function IconMoon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
      />
    </svg>
  );
}

/** Segmented control: tap sun or moon — clearer than a single ambiguous toggle. */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div
      className={cn(
        "relative inline-grid h-11 w-[5.5rem] grid-cols-2 rounded-full p-1",
        "bg-slate-200/95 shadow-inner ring-1 ring-brand/25 dark:bg-slate-950/80 dark:ring-brand/35",
        className,
      )}
      role="group"
      aria-label="Color theme"
    >
      <span
        className={cn(
          "pointer-events-none absolute inset-y-1 left-1 w-[calc(50%-6px)] rounded-full bg-white shadow-md ring-2 ring-brand/25 transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] dark:bg-slate-800 dark:ring-brand/40",
          isDark && "translate-x-[calc(100%+4px)]",
        )}
      />
      <button
        type="button"
        onClick={() => setTheme("light")}
        className={cn(
          "relative z-10 flex items-center justify-center rounded-full py-2 transition-colors",
          !isDark ? "text-brand" : "text-ink-muted hover:text-ink",
        )}
        aria-pressed={!isDark}
        aria-label="Use light theme"
      >
        <IconSun className="h-[1.15rem] w-[1.15rem]" />
      </button>
      <button
        type="button"
        onClick={() => setTheme("dark")}
        className={cn(
          "relative z-10 flex items-center justify-center rounded-full py-2 transition-colors",
          isDark ? "text-brand-glow" : "text-ink-muted hover:text-ink",
        )}
        aria-pressed={isDark}
        aria-label="Use dark theme"
      >
        <IconMoon className="h-[1.15rem] w-[1.15rem]" />
      </button>
    </div>
  );
}
