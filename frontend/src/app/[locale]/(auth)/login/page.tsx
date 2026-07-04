"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth";
import { errorMessage } from "@/lib/api-client";
import { Alert, Button, Input, Spinner } from "@/components/ui";

export default function LoginPage() {
  const t = useTranslations("auth");
  const tc = useTranslations("common");
  const { login } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const user = await login(form.email, form.password);
      router.push(
        user.role === "admin" || user.role === "super_admin" ? "/admin" : "/dashboard",
      );
    } catch (err) {
      setError(errorMessage(err));
      setLoading(false);
    }
  }

  return (
    <>
      <h1 className="text-2xl font-bold text-primary">{t("loginTitle")}</h1>
      <p className="mt-1 text-sm text-text/70">{t("loginSubtitle")}</p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <Input
          name="email"
          type="email"
          label={tc("email")}
          required
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <Input
          name="password"
          type="password"
          label={tc("password")}
          required
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        <div className="text-right">
          <Link href="/forgot-password" className="text-sm text-secondary hover:underline">
            {t("forgotPassword")}
          </Link>
        </div>
        {error && <Alert tone="error">{error}</Alert>}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? <Spinner /> : tc("login")}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-text/70">
        {t("noAccount")}{" "}
        <Link href="/signup" className="font-medium text-secondary hover:underline">
          {tc("signup")}
        </Link>
      </p>
    </>
  );
}
