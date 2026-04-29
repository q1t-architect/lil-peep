"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { en } from "@/lib/i18n/locales/en";
import { es } from "@/lib/i18n/locales/es";
import { resolve, type Locale, type TranslationKey } from "@/lib/i18n";
import type { Translations } from "@/lib/i18n/locales/en";

const STORAGE_KEY = "neighborly-locale";
const COOKIE_NAME = "neighborly-locale";

const locales: Record<Locale, Translations> = { en, es };

type LocaleContextValue = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: TranslationKey) => string;
};

export const LocaleContext = createContext<LocaleContextValue | null>(null);

function detectLocale(): Locale {
  if (typeof window === "undefined") return "en";

  // 1. Stored preference
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "en" || stored === "es") return stored;

  // 2. Browser language
  const lang = navigator.language?.toLowerCase() ?? "";
  if (lang.startsWith("es")) return "es";

  return "en";
}

function setCookie(locale: Locale) {
  const maxAge = 60 * 60 * 24 * 365; // 1 year
  document.cookie = `${COOKIE_NAME}=${locale};path=/;max-age=${maxAge};SameSite=Lax`;
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    setLocaleState(detectLocale());
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    window.localStorage.setItem(STORAGE_KEY, l);
    setCookie(l);
  }, []);

  const t = useCallback(
    (key: TranslationKey) => resolve(locales[locale], key),
    [locale],
  );

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}
