"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { api, errorMessage } from "@/lib/api-client";
import { applyPalette } from "@/lib/theme";
import type { ThemePalette } from "@/lib/types";
import { Alert, Button, Card, PageTitle, Spinner } from "@/components/ui";

const TOKENS = ["primary", "secondary", "accent", "background", "text"] as const;

const DEFAULTS: ThemePalette = {
  primary: "#111827",
  secondary: "#b45309",
  accent: "#f5e6c8",
  background: "#ffffff",
  text: "#374151",
};

export default function AdminThemePage() {
  const t = useTranslations("adminPanel.theme");
  const ta = useTranslations("adminPanel.actions");
  const [palette, setPalette] = useState<ThemePalette>(DEFAULTS);
  const [state, setState] = useState<"idle" | "loading" | "saved">("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    api<Partial<ThemePalette>>("/admin/theme")
      .then((data) =>
        setPalette({
          primary: data.primary ?? DEFAULTS.primary,
          secondary: data.secondary ?? DEFAULTS.secondary,
          accent: data.accent ?? DEFAULTS.accent,
          background: data.background ?? DEFAULTS.background,
          text: data.text ?? DEFAULTS.text,
        }),
      )
      .catch(() => {});
  }, []);

  function setToken(token: keyof ThemePalette, value: string) {
    const next = { ...palette, [token]: value };
    setPalette(next);
    applyPalette(next); // live preview
  }

  async function save() {
    setState("loading");
    setError("");
    try {
      await api("/admin/theme", { method: "PUT", body: palette });
      setState("saved");
    } catch (err) {
      setError(errorMessage(err));
      setState("idle");
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageTitle title={t("title")} subtitle={t("subtitle")} />

      <Card>
        <div className="space-y-4">
          {TOKENS.map((token) => (
            <div key={token} className="flex items-center justify-between gap-4">
              <label htmlFor={`color-${token}`} className="text-sm font-medium text-primary">
                {t(token)}
              </label>
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs text-text/60">{palette[token]}</span>
                <input
                  id={`color-${token}`}
                  type="color"
                  value={palette[token]}
                  onChange={(e) => setToken(token, e.target.value)}
                  className="h-9 w-14 cursor-pointer rounded border border-text/20"
                />
              </div>
            </div>
          ))}
        </div>

        {error && <div className="mt-4"><Alert tone="error">{error}</Alert></div>}
        {state === "saved" && <div className="mt-4"><Alert tone="success">{t("saved")}</Alert></div>}

        <div className="mt-6">
          <Button onClick={save} disabled={state === "loading"}>
            {state === "loading" ? <Spinner /> : ta("saveTheme")}
          </Button>
        </div>
      </Card>

      {/* Live preview strip */}
      <Card className="mt-6">
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-lg bg-primary px-4 py-2 text-sm text-background">primary</span>
          <span className="rounded-lg bg-secondary px-4 py-2 text-sm text-background">secondary</span>
          <span className="rounded-lg bg-accent px-4 py-2 text-sm text-primary">accent</span>
          <span className="rounded-lg border border-text/20 px-4 py-2 text-sm text-text">text</span>
        </div>
      </Card>
    </div>
  );
}
