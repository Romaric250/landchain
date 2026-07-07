"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { api, errorMessage } from "@/lib/api-client";
import { Alert, Badge, Button, Card, PageTitle, Spinner, statusColor } from "@/components/ui";
import { AiVerdictCard } from "@/components/ui/AiVerdictCard";
import { FileUpload } from "@/components/ui/FileUpload";

interface KycSubmission {
  status: string;
  review_notes: string | null;
  created_at: string;
  ai_face_match_score: number | null;
  ai_document_check: {
    verdict: string;
    score: number;
    flagged_reasons: string[];
    user_message?: string;
  } | null;
}

interface KycStatus {
  kyc_status: string;
  latest_submission: KycSubmission | null;
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
  const [aiPolling, setAiPolling] = useState(false);

  useEffect(() => {
    api<KycStatus>("/kyc/status").then(setStatus).catch(() => {});
  }, []);

  useEffect(() => {
    if (!aiPolling) return;
    const sub = status?.latest_submission;
    if (sub?.ai_face_match_score != null && sub?.ai_document_check) {
      setAiPolling(false);
      return;
    }
    const timer = window.setInterval(() => {
      api<KycStatus>("/kyc/status").then(setStatus).catch(() => {});
    }, 3000);
    const timeout = window.setTimeout(() => setAiPolling(false), 90000);
    return () => {
      window.clearInterval(timer);
      window.clearTimeout(timeout);
    };
  }, [aiPolling, status?.latest_submission]);

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
      setAiPolling(true);
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
  const submission = status?.latest_submission;
  const aiReady = submission?.ai_face_match_score != null && submission?.ai_document_check;
  const showAiBlock = state === "done" || kycStatus === "pending" || kycStatus === "verified";

  return (
    <div className="mx-auto max-w-2xl">
      <PageTitle title={t("title")} subtitle={t("subtitle")} />

      <Card className="mb-6 flex items-center justify-between">
        <span className="text-sm font-semibold text-text/70">{t("statusTitle")}</span>
        <Badge color={statusColor(kycStatus)}>
          {t(kycStatus as "not_started" | "pending" | "verified" | "rejected")}
        </Badge>
      </Card>

      {kycStatus === "rejected" && submission?.review_notes && (
        <div className="mb-6">
          <Alert tone="error">{submission.review_notes}</Alert>
        </div>
      )}

      {state === "done" && (
        <div className="mb-6">
          <Alert tone="success">{t("submitted")}</Alert>
        </div>
      )}

      {showAiBlock && submission && (
        <Card className="mb-6 space-y-4">
          <h2 className="text-sm font-semibold uppercase text-text/60">{t("aiComplete")}</h2>
          {!aiReady ? (
            <AiVerdictCard analyzing />
          ) : (
            <>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase text-text/50">{t("aiFaceMatch")}</p>
                <AiVerdictCard
                  score={submission.ai_face_match_score}
                  verdict={submission.ai_face_match_score! >= 0.75 ? "authentic" : "suspicious"}
                  compact
                />
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase text-text/50">{t("aiDocCheck")}</p>
                <AiVerdictCard
                  verdict={submission.ai_document_check!.verdict as "authentic" | "suspicious" | "fraudulent"}
                  score={submission.ai_document_check!.score}
                  userMessage={submission.ai_document_check!.user_message}
                  flaggedReasons={submission.ai_document_check!.flagged_reasons}
                />
              </div>
            </>
          )}
          <p className="text-xs text-text/50">{t("aiHumanNote")}</p>
        </Card>
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
  return <KycContent />;
}
