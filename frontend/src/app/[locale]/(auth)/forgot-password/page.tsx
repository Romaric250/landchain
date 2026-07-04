"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { api, errorMessage } from "@/lib/api-client";
import { Alert, Button, Input, Spinner } from "@/components/ui";

export default function ForgotPasswordPage() {
  const t = useTranslations("auth");
  const tc = useTranslations("common");
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("loading");
    setError("");
    try {
      const data = await api<{ message: string }>("/auth/forgot-password", {
        method: "POST",
        body: { email },
        auth: false,
      });
      setMessage(data.message);
      setState("done");
    } catch (err) {
      setError(errorMessage(err));
      setState("idle");
    }
  }

  return (
    <>
      <h1 className="text-2xl font-bold text-primary">{t("forgotTitle")}</h1>
      <p className="mt-1 text-sm text-text/70">{t("forgotSubtitle")}</p>
      {state === "done" ? (
        <div className="mt-6">
          <Alert tone="success">{message}</Alert>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-6 space-y-4">
          <Input
            name="email"
            type="email"
            label={tc("email")}
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {error && <Alert tone="error">{error}</Alert>}
          <Button type="submit" className="w-full" disabled={state === "loading"}>
            {state === "loading" ? <Spinner /> : t("sendResetLink")}
          </Button>
        </form>
      )}
    </>
  );
}
