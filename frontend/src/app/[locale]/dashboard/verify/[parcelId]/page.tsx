"use client";

import { use, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { api, ApiError, errorMessage } from "@/lib/api-client";
import { Alert, Badge, Card, PageTitle, Spinner, statusColor } from "@/components/ui";

interface Report {
  parcel: { parcel_reference: string; region: string; status: string };
  current_owner: { name: string; kyc_verified: boolean };
  transactions: { id: string; type: string; status: string; timestamp: string; blockchain_tx_hash: string | null }[];
  documents: { id: string; doc_type: string; ai_verification_result: { verdict: string; score: number } | null; human_review_status: string }[];
  open_disputes: number;
  blockchain: { anchored: boolean; tx_hash: string | null; record_hash: string | null };
  verdict: "verified" | "disputed" | "flagged";
  generated_at: string;
}

export default function VerificationReportPage({
  params,
}: {
  params: Promise<{ parcelId: string }>;
}) {
  const { parcelId } = use(params);
  const t = useTranslations("verification");
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState("");
  const [needsSub, setNeedsSub] = useState(false);

  useEffect(() => {
    api<Report>(`/parcels/${parcelId}/verify`, { method: "POST" })
      .then(setReport)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 402) setNeedsSub(true);
        else setError(errorMessage(err));
      });
  }, [parcelId]);

  if (needsSub) {
    return (
      <div className="mx-auto max-w-2xl">
        <PageTitle title={t("title")} />
        <Alert tone="warning">
          {t("needSub")}{" "}
          <Link href="/dashboard/subscription" className="font-semibold underline">
            →
          </Link>
        </Alert>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="flex justify-center py-20">
        {error ? <Alert tone="error">{error}</Alert> : <Spinner className="h-8 w-8" />}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageTitle
        title={`${t("title")} — ${report.parcel.parcel_reference}`}
        subtitle={`${t("generated")}: ${new Date(report.generated_at).toLocaleString()}`}
      />

      <Card className="mb-6">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold uppercase text-text/60">{t("verdict")}</span>
          <Badge color={statusColor(report.verdict === "verified" ? "verified" : report.verdict)}>
            {t(report.verdict)}
          </Badge>
        </div>
        <dl className="mt-4 grid gap-4 sm:grid-cols-3 text-sm">
          <div>
            <dt className="text-text/60">{t("owner")}</dt>
            <dd className="font-medium text-primary">
              {report.current_owner.name}{" "}
              {report.current_owner.kyc_verified && (
                <Badge color="green" className="ml-1">{t("kycVerified")}</Badge>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-text/60">{t("openDisputes")}</dt>
            <dd className="font-medium text-primary">{report.open_disputes}</dd>
          </div>
          <div>
            <dt className="text-text/60">Blockchain</dt>
            <dd className="font-medium text-primary">
              {report.blockchain.anchored ? "✓" : "—"}
            </dd>
          </div>
        </dl>
        {report.blockchain.record_hash && (
          <p className="mt-3 break-all font-mono text-xs text-text/50">
            {report.blockchain.record_hash}
          </p>
        )}
      </Card>

      <Card className="mb-6">
        <h2 className="text-sm font-semibold uppercase text-text/60">{t("documents")}</h2>
        <ul className="mt-3 space-y-3">
          {report.documents.map((doc) => (
            <li key={doc.id} className="flex items-center justify-between text-sm">
              <span className="font-medium capitalize text-primary">
                {doc.doc_type.replace(/_/g, " ")}
              </span>
              {doc.ai_verification_result ? (
                <Badge color={statusColor(doc.ai_verification_result.verdict)}>
                  {doc.ai_verification_result.verdict} (
                  {Math.round(doc.ai_verification_result.score * 100)}%)
                </Badge>
              ) : (
                <Badge>—</Badge>
              )}
            </li>
          ))}
          {report.documents.length === 0 && <li className="text-sm text-text/60">—</li>}
        </ul>
      </Card>

      <Card>
        <h2 className="text-sm font-semibold uppercase text-text/60">{t("history")}</h2>
        <ol className="mt-3 space-y-4 border-l-2 border-accent pl-4">
          {report.transactions.map((tx) => (
            <li key={tx.id} className="relative text-sm">
              <span className="absolute -left-[1.4rem] top-1 h-3 w-3 rounded-full bg-secondary" />
              <p className="font-medium capitalize text-primary">{tx.type}</p>
              <p className="text-xs text-text/60">{new Date(tx.timestamp).toLocaleString()}</p>
              {tx.blockchain_tx_hash && (
                <p className="break-all font-mono text-xs text-text/50">{tx.blockchain_tx_hash}</p>
              )}
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}
