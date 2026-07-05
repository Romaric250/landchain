"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { api, errorMessage } from "@/lib/api-client";
import type { Dispute } from "@/lib/types";
import { Alert, Badge, Button, Card, EmptyState, Input, ListRowsSkeleton, PageTitle, Spinner, Textarea, statusColor } from "@/components/ui";

export default function DisputesPage() {
  const t = useTranslations("disputes");
  const [disputes, setDisputes] = useState<Dispute[] | null>(null);
  const [form, setForm] = useState({ parcel_id: "", description: "" });
  const [state, setState] = useState<"idle" | "loading">("idle");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  function load() {
    api<{ items: Dispute[] }>("/disputes/mine")
      .then((d) => setDisputes(d.items))
      .catch(() => setDisputes([]));
  }

  useEffect(load, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("loading");
    setError("");
    setNotice("");
    try {
      await api("/disputes", { method: "POST", body: form });
      setNotice(t("raised"));
      setForm({ parcel_id: "", description: "" });
      load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setState("idle");
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageTitle title={t("title")} />

      <Card className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase text-text/60">{t("raise")}</h2>
        <form onSubmit={submit} className="space-y-3">
          <Input
            label={t("parcelRef")}
            required
            value={form.parcel_id}
            onChange={(e) => setForm({ ...form, parcel_id: e.target.value })}
          />
          <Textarea
            label={t("description")}
            required
            minLength={10}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          {error && <Alert tone="error">{error}</Alert>}
          {notice && <Alert tone="success">{notice}</Alert>}
          <Button type="submit" disabled={state === "loading"}>
            {state === "loading" ? <Spinner /> : t("submit")}
          </Button>
        </form>
      </Card>

      {disputes === null ? (
        <ListRowsSkeleton count={3} />
      ) : disputes.length === 0 ? (
        <EmptyState>{t("empty")}</EmptyState>
      ) : (
        <div className="space-y-3">
          {disputes.map((d) => (
            <Card key={d.id}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono font-semibold text-primary">
                  {d.parcel_reference ?? d.parcel_id}
                </span>
                <Badge color={statusColor(d.status)}>{d.status}</Badge>
              </div>
              {d.description && <p className="mt-2 text-sm text-text/70">{d.description}</p>}
              {d.resolution_notes && (
                <p className="mt-2 rounded bg-accent/40 p-2 text-sm text-primary">
                  {d.resolution_notes}
                </p>
              )}
              <p className="mt-2 text-xs text-text/50">
                {new Date(d.created_at).toLocaleString()}
              </p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
