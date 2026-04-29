/**
 * Lightweight i18n — two locales, no external dependency.
 * Usage: const { t, locale, setLocale } = useLocale()
 *        t('nav.map') → "Map" | "Mapa"
 */

import { useContext } from "react";
import { LocaleContext } from "@/components/providers/LocaleProvider";

export type Locale = "en" | "es";

export { LocaleContext };

/** Typed dot-path accessor for nested translation objects. */
type DotPath<T, Prefix extends string = ""> = T extends object
  ? {
      [K in keyof T & string]: DotPath<T[K], Prefix extends "" ? K : `${Prefix}.${K}`>;
    }[keyof T & string]
  : Prefix;

import type { Translations } from "./locales/en";
export type TranslationKey = DotPath<Translations>;

/** Resolve a dot-notation key from a translations object. */
export function resolve(translations: Translations, key: TranslationKey): string {
  const parts = key.split(".");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let node: any = translations;
  for (const part of parts) {
    if (node == null || typeof node !== "object") return key;
    node = node[part];
  }
  return typeof node === "string" ? node : key;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
}
