"use client";

import { Badge, Spinner, statusColor } from "@/components/ui";
import { useTranslations } from "next-intl";

export interface AiVerdictProps {
  verdict?: "authentic" | "suspicious" | "fraudulent" | null;
  score?: number | null;
  userMessage?: string | null;
  flaggedReasons?: string[];
  analyzing?: boolean;
  compact?: boolean;
}

export function AiVerdictCard({
  verdict,
  score,
  userMessage,
  flaggedReasons,
  analyzing,
  compact,
}: AiVerdictProps) {
  const t = useTranslations("aiAnalysis");

  if (analyzing) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-text/10 bg-background/50 px-3 py-2 text-sm text-text/70">
        <Spinner className="h-4 w-4" />
        {t("analyzing")}
      </div>
    );
  }

  if (!verdict && score == null) return null;

  const label =
    verdict === "authentic"
      ? t("authentic")
      : verdict === "fraudulent"
        ? t("fraudulent")
        : verdict === "suspicious"
          ? t("suspicious")
          : null;

  return (
    <div className="rounded-lg border border-text/10 bg-background/40 px-3 py-2 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        {label && verdict && (
          <Badge color={statusColor(verdict)}>{label}</Badge>
        )}
        {score != null && (
          <span className="text-xs text-text/60">{t("confidence", { score: Math.round(score * 100) })}</span>
        )}
        {verdict && verdict !== "authentic" && !compact && (
          <span className="text-xs font-medium text-amber-700 dark:text-amber-400">{t("humanReview")}</span>
        )}
      </div>
      {userMessage && <p className="mt-2 text-text/80">{userMessage}</p>}
      {!compact && flaggedReasons && flaggedReasons.length > 0 && (
        <div className="mt-2">
          <p className="text-xs font-semibold uppercase text-text/50">{t("reasons")}</p>
          <ul className="mt-1 list-inside list-disc text-xs text-text/70">
            {flaggedReasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
      )}
      {!compact && (
        <p className="mt-2 text-xs text-text/50">{t("humanNote")}</p>
      )}
    </div>
  );
}
