const STORAGE_KEY = "landchain-locale-v2";

/** Persist locale when the user explicitly switches language in the UI. */
export function persistLocaleChoice(next: "en" | "fr") {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, next);
  }
}

export function readPersistedLocale(): "en" | "fr" | null {
  if (typeof window === "undefined") return null;
  const v = localStorage.getItem(STORAGE_KEY);
  return v === "en" || v === "fr" ? v : null;
}
