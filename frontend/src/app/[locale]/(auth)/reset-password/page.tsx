"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { api, errorMessage } from "@/lib/api-client";
import { Alert, Button, Input, Spinner } from "@/components/ui";

function ResetPasswordForm() {
  const t = useTranslations("auth");
  const tc = useTranslations("common");
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("loading");
    setError("");
    try {
      const data = await api<{ message: string }>("/auth/reset-password", {
        method: "POST",
        body: { token, password },
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
      <h1 className="text-2xl font-bold text-primary">{t("resetTitle")}</h1>
      {state === "done" ? (
        <div className="mt-6 space-y-4">
          <Alert tone="success">{message}</Alert>
          <p className="text-center text-sm">
            <Link href="/login" className="font-medium text-secondary hover:underline">
              {tc("login")}
            </Link>
          </p>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-6 space-y-4">
          <Input
            name="password"
            type="password"
            label={t("newPassword")}
            hint={t("passwordHint")}
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <Alert tone="error">{error}</Alert>}
          <Button type="submit" className="w-full" disabled={state === "loading"}>
            {state === "loading" ? <Spinner /> : t("resetPassword")}
          </Button>
        </form>
      )}
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
