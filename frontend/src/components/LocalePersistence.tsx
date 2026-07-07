"use client";

import { useEffect } from "react";
import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

const STORAGE_KEY = "landchain-locale";

/** Keeps French as default unless the user explicitly switched language. */
export function LocalePersistence() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as "fr" | "en" | null;
    if (!stored) {
      localStorage.setItem(STORAGE_KEY, routing.defaultLocale);
      if (locale !== routing.defaultLocale) {
        router.replace(pathname, { locale: routing.defaultLocale });
      }
      return;
    }
    if (stored !== locale && routing.locales.includes(stored)) {
      router.replace(pathname, { locale: stored });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, locale);
  }, [locale]);

  return null;
}

export function persistLocaleChoice(next: "fr" | "en") {
  localStorage.setItem(STORAGE_KEY, next);
}
