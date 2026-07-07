"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { api, errorMessage } from "@/lib/api-client";
import { Alert, Button, Input, PasswordInput, Spinner } from "@/components/ui";

export default function SignupPage() {
  const t = useTranslations("auth");
  const tc = useTranslations("common");
  const locale = useLocale();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("loading");
    setError("");
    try {
      await api("/auth/register", {
        method: "POST",
        body: { ...form, locale },
        auth: false,
      });
      setState("done");
    } catch (err) {
      setError(errorMessage(err));
      setState("idle");
    }
  }

  if (state === "done") {
    return (
      <>
        <h1 className="text-2xl font-bold text-primary">{t("signupTitle")}</h1>
        <div className="mt-6">
          <Alert tone="success">{t("checkInbox")}</Alert>
        </div>
        <p className="mt-6 text-center text-sm">
          <Link href="/login" className="font-medium text-secondary hover:underline">
            {tc("login")}
          </Link>
        </p>
      </>
    );
  }

  return (
    <>
      <h1 className="text-2xl font-bold text-primary">{t("signupTitle")}</h1>
      <p className="mt-1 text-sm text-text/70">{t("signupSubtitle")}</p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <Input
          name="name"
          label={tc("name")}
          required
          minLength={2}
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <Input
          name="email"
          type="email"
          label={tc("email")}
          required
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <Input
          name="phone"
          type="tel"
          label={tc("phone")}
          required
          minLength={6}
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
        />
        <PasswordInput
          name="password"
          label={tc("password")}
          hint={t("passwordHint")}
          showLabel={t("showPassword")}
          hideLabel={t("hidePassword")}
          required
          minLength={8}
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        {error && <Alert tone="error">{error}</Alert>}
        <Button type="submit" className="w-full" disabled={state === "loading"}>
          {state === "loading" ? <Spinner /> : tc("signup")}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-text/70">
        {t("haveAccount")}{" "}
        <Link href="/login" className="font-medium text-secondary hover:underline">
          {tc("login")}
        </Link>
      </p>
    </>
  );
}
