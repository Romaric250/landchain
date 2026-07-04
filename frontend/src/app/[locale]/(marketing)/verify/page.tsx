"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { api, errorMessage } from "@/lib/api-client";
import type { QuickVerifyResult } from "@/lib/types";
import { Alert, Badge, Button, Input, PageTitle, Spinner, statusColor } from "@/components/ui";

export default function VerifyPage() {
  const t = useTranslations("verify");
  const tc = useTranslations("common");
  const [ref, setRef] = useState("");
  const [result, setResult] = useState<QuickVerifyResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const data = await api<QuickVerifyResult>(
        `/verify/quick?ref=${encodeURIComponent(ref)}`,
        { auth: false },
      );
      setResult(data);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  const statusMessage = result?.found
    ? result.status === "disputed"
      ? t("foundDisputed")
      : result.status === "flagged"
        ? t("foundFlagged")
        : t("foundRegistered")
    : t("notFound");

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <PageTitle title={t("title")} subtitle={t("subtitle")} />

      <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row">
        <Input
          value={ref}
          onChange={(e) => setRef(e.target.value)}
          placeholder={t("placeholder")}
          required
          minLength={3}
          aria-label={t("placeholder")}
        />
        <Button type="submit" disabled={loading} className="shrink-0">
          {loading ? <Spinner /> : t("button")}
        </Button>
      </form>

      {error && (
        <div className="mt-6">
          <Alert tone="error">{error}</Alert>
        </div>
      )}

      {result && (
        <div className="mt-8 rounded-xl border border-text/10 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-mono text-lg font-semibold text-primary">
              {result.parcel_reference}
            </h2>
            <Badge color={statusColor(result.status)}>
              {tc(`status.${result.status}`)}
            </Badge>
          </div>
          <p
            className={`mt-4 text-sm ${
              result.status === "disputed" || result.status === "flagged"
                ? "text-red-700"
                : "text-text/80"
            }`}
          >
            {statusMessage}
          </p>
          {result.found && (
            <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-text/60">{t("region")}</dt>
                <dd className="font-medium text-primary">{result.region}</dd>
              </div>
              {result.registration_year && (
                <div>
                  <dt className="text-text/60">{t("registeredIn")}</dt>
                  <dd className="font-medium text-primary">{result.registration_year}</dd>
                </div>
              )}
            </dl>
          )}

          <div className="mt-6 rounded-lg bg-accent/40 p-4">
            <h3 className="font-semibold text-primary">{t("upgradeTitle")}</h3>
            <p className="mt-1 text-sm text-text/70">{t("upgradeText")}</p>
            <Link
              href="/pricing"
              className="mt-3 inline-block rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-background hover:opacity-90"
            >
              {t("upgradeCta")}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
