"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { api, errorMessage } from "@/lib/api-client";
import { Alert, Badge, Button, Card, PageTitle, Spinner, statusColor } from "@/components/ui";
import { FileUpload } from "@/components/ui/FileUpload";
import { AppShell } from "@/components/dashboard/Shell";

interface KycStatus {
  kyc_status: string;
  latest_submission: {
    status: string;
    review_notes: string | null;
    created_at: string;
  } | null;
}

function KycContent() {
  const t = useTranslations("kyc");
  const { user, refreshUser } = useAuth();
  const [status, setStatus] = useState<KycStatus | null>(null);
  const [form, setForm] = useState({
    id_document_url: "",
    id_document_back_url: "",
    selfie_url: "",
  });
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    api<KycStatus>("/kyc/status").then(setStatus).catch(() => {});
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("loading");
    setError("");
    try {
      await api("/kyc/submit", {
        method: "POST",
        body: {
          id_document_url: form.id_document_url,
          id_document_back_url: form.id_document_back_url || null,
          selfie_url: form.selfie_url,
        },
      });
      setState("done");
      await refreshUser();
      setStatus(await api<KycStatus>("/kyc/status"));
    } catch (err) {
      setError(errorMessage(err));
      setState("idle");
    }
  }

  if (!user) return null;
  const kycStatus = status?.kyc_status ?? user.kyc_status;
  const canSubmit = kycStatus === "not_started" || kycStatus === "rejected";

  return (
    <div className="mx-auto max-w-2xl">
      <PageTitle title={t("title")} subtitle={t("subtitle")} />

      <Card className="mb-6 flex items-center justify-between">
        <span className="text-sm font-semibold text-text/70">{t("statusTitle")}</span>
        <Badge color={statusColor(kycStatus)}>
          {t(kycStatus as "not_started" | "pending" | "verified" | "rejected")}
        </Badge>
      </Card>

      {kycStatus === "rejected" && status?.latest_submission?.review_notes && (
        <div className="mb-6">
          <Alert tone="error">{status.latest_submission.review_notes}</Alert>
        </div>
      )}

      {state === "done" && (
        <div className="mb-6">
          <Alert tone="success">{t("submitted")}</Alert>
        </div>
      )}

      {canSubmit && state !== "done" && (
        <form onSubmit={submit} className="space-y-6">
          <FileUpload
            endpoint="kycDocument"
            label={t("idFront")}
            value={form.id_document_url}
            onChange={(url) => setForm({ ...form, id_document_url: url })}
          />
          <FileUpload
            endpoint="kycDocument"
            label={t("idBack")}
            value={form.id_document_back_url}
            onChange={(url) => setForm({ ...form, id_document_back_url: url })}
          />
          <FileUpload
            endpoint="kycDocument"
            label={t("selfie")}
            value={form.selfie_url}
            onChange={(url) => setForm({ ...form, selfie_url: url })}
            cameraFacing="user"
          />
          {error && <Alert tone="error">{error}</Alert>}
          <Button
            type="submit"
            disabled={state === "loading" || !form.id_document_url || !form.selfie_url}
          >
            {state === "loading" ? <Spinner /> : t("submit")}
          </Button>
        </form>
      )}
    </div>
  );
}

export default function KycPage() {
  const t = useTranslations("dashboard.nav");
  const nav = [
    { href: "/dashboard", label: t("overview") },
    { href: "/onboarding/kyc", label: t("kyc") },
  ];
  return (
    <AppShell nav={nav} title="KYC">
      <KycContent />
    </AppShell>
  );
}
