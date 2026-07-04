"use client";

import { useEffect } from "react";
import { API_BASE } from "./api-client";
import type { ThemePalette } from "./types";

/** Loads the active palette from theme_settings and applies it as CSS
 *  variables at runtime (§9.2). Falls back silently to the defaults in
 *  globals.css when the backend is unreachable. */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/theme`);
        if (!res.ok) return;
        const palette = (await res.json()) as ThemePalette;
        applyPalette(palette);
      } catch {
        /* backend offline — keep defaults */
      }
    })();
  }, []);

  return <>{children}</>;
}

export function applyPalette(palette: Partial<ThemePalette>) {
  const root = document.documentElement;
  if (palette.primary) root.style.setProperty("--lc-primary", palette.primary);
  if (palette.secondary) root.style.setProperty("--lc-secondary", palette.secondary);
  if (palette.accent) root.style.setProperty("--lc-accent", palette.accent);
  if (palette.background) root.style.setProperty("--lc-background", palette.background);
  if (palette.text) root.style.setProperty("--lc-text", palette.text);
}
