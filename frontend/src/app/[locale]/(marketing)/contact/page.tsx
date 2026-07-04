"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { api, errorMessage } from "@/lib/api-client";
import { Alert, Button, Input, Textarea, PageTitle } from "@/components/ui";
import { WaitlistForm } from "@/components/marketing/WaitlistForm";

export default function ContactPage() {
  const t = useTranslations("contact");
  const tc = useTranslations("common");
  const tw = useTranslations("home.waitlist");
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("loading");
    try {
      await api("/contact", { method: "POST", body: form, auth: false });
      setState("done");
    } catch (err) {
      setError(errorMessage(err));
      setState("error");
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <PageTitle title={t("title")} subtitle={t("subtitle")} />

      {state === "done" ? (
        <Alert tone="success">{t("success")}</Alert>
      ) : (
        <form onSubmit={submit} className="space-y-4">
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
          <Textarea
            name="message"
            label={t("message")}
            required
            minLength={10}
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
          />
          {state === "error" && <Alert tone="error">{error}</Alert>}
          <Button type="submit" disabled={state === "loading"}>
            {t("send")}
          </Button>
        </form>
      )}

      <div className="mt-16 rounded-xl bg-accent/40 p-6">
        <h2 className="text-lg font-semibold text-primary">{tw("title")}</h2>
        <p className="mt-1 text-sm text-text/70">{tw("subtitle")}</p>
        <div className="mt-4">
          <WaitlistForm />
        </div>
      </div>
    </div>
  );
}
