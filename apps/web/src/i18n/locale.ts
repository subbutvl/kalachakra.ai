"use client";

import { useEffect } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { ta } from "./ta";

/**
 * The language of the screens (English or Tamil). The report has its own
 * language choice, which starts from this one. Screen text is written in
 * English in the code and looked up in the Tamil dictionary (ta.ts); a
 * missing entry shows the English, and `pnpm lint` lists any that are missing.
 */
export type Locale = "en" | "ta";

interface LocaleState {
  locale: Locale;
  setLocale: (l: Locale) => void;
}

export const useLocaleStore = create<LocaleState>()(
  persist((set) => ({ locale: "en", setLocale: (locale) => set({ locale }) }), {
    name: "kalachakra-locale",
    storage: createJSONStorage(() => localStorage),
    // Read after the first render, so the server's English page and the browser's first render match.
    skipHydration: true,
  }),
);

export type Vars = Record<string, string | number>;
export type T = (text: string, vars?: Vars) => string;

export function translate(locale: Locale, text: string, vars?: Vars): string {
  const out = locale === "ta" ? (ta[text] ?? text) : text;
  return vars ? out.replace(/\{(\w+)\}/g, (m: string, k: string) => (k in vars ? String(vars[k]) : m)) : out;
}

/** The current language and its lookup function. */
export function useT(): { t: T; locale: Locale } {
  const locale = useLocaleStore((s) => s.locale);
  return { t: (text, vars) => translate(locale, text, vars), locale };
}

/** Loads the saved language once the page is running, then keeps <html lang> in step. */
export function useLocaleSetup(): void {
  useEffect(() => {
    void useLocaleStore.persist.rehydrate();
  }, []);
  useHtmlLang();
}

/** Keeps <html lang> in step with the chosen language (fonts and spacing follow it). */
export function useHtmlLang(): void {
  const locale = useLocaleStore((s) => s.locale);
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
}
