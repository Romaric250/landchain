"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { api, errorMessage } from "@/lib/api-client";
import { Button, Input, Alert } from "@/components/ui";

export function WaitlistForm() {
  const t = useTranslations("home.waitlist");
  const locale = useLocale();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("loading");
    try {
      await api("/waitlist", { method: "POST", body: { email, locale }, auth: false });
      setState("done");
    } catch (err) {
      setError(errorMessage(err));
      setState("error");
    }
  }

  if (state === "done") {
    return <Alert tone="success">{t("success")}</Alert>;
  }

  return (
    <form onSubmit={submit} className="flex w-full max-w-md flex-col gap-3 sm:flex-row">
      <Input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={t("placeholder")}
        aria-label={t("placeholder")}
      />
      <Button type="submit" variant="secondary" disabled={state === "loading"} className="shrink-0">
        {t("button")}
      </Button>
      {state === "error" && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}
