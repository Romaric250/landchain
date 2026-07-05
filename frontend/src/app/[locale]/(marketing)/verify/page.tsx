"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Search,
  XCircle,
} from "lucide-react";
import { api, errorMessage } from "@/lib/api-client";
import type { QuickVerifyResult } from "@/lib/types";
import { Alert, Spinner } from "@/components/ui";

const EXAMPLE_REFS = ["LT-SMOKE-1783165312", "LT-2024-DLA-00871"];

type StatusKind = "registered" | "disputed" | "flagged" | "not_found";

function resolveStatus(result: QuickVerifyResult): StatusKind {
  if (!result.found) return "not_found";
  if (result.status === "disputed") return "disputed";
  if (result.status === "flagged") return "flagged";
  return "registered";
}

const STATUS_STYLE: Record<
  StatusKind,
  { border: string; bg: string; icon: typeof CheckCircle2; iconColor: string }
> = {
  registered: {
    border: "border-emerald-200",
    bg: "bg-emerald-50",
    icon: CheckCircle2,
    iconColor: "text-emerald-600",
  },
  disputed: {
    border: "border-amber-200",
    bg: "bg-amber-50",
    icon: AlertTriangle,
    iconColor: "text-amber-600",
  },
  flagged: {
    border: "border-orange-200",
    bg: "bg-orange-50",
    icon: AlertTriangle,
    iconColor: "text-orange-600",
  },
  not_found: {
    border: "border-red-200",
    bg: "bg-red-50",
    icon: XCircle,
    iconColor: "text-red-600",
  },
};

export default function VerifyPage() {
  const t = useTranslations("verify");
  const [ref, setRef] = useState("");
  const [result, setResult] = useState<QuickVerifyResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const steps = t.raw("steps") as { title: string; text: string }[];

  async function runSearch(query: string) {
    const trimmed = query.trim();
    if (trimmed.length < 3) return;
    setRef(trimmed);
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const data = await api<QuickVerifyResult>(
        `/verify/quick?ref=${encodeURIComponent(trimmed)}`,
        { auth: false },
      );
      setResult(data);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await runSearch(ref);
  }

  const statusMessage = result
    ? resolveStatus(result) === "disputed"
      ? t("foundDisputed")
      : resolveStatus(result) === "flagged"
        ? t("foundFlagged")
        : result.found
          ? t("foundRegistered")
          : t("notFound")
    : "";

  const statusLabel = result
    ? t(
        resolveStatus(result) === "registered"
          ? "statusRegistered"
          : resolveStatus(result) === "disputed"
            ? "statusDisputed"
            : resolveStatus(result) === "flagged"
              ? "statusFlagged"
              : "statusNotFound",
      )
    : "";

  const style = result ? STATUS_STYLE[resolveStatus(result)] : null;
  const StatusIcon = style?.icon ?? Search;

  return (
    <section className="bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-12">
        {/* Header */}
        <div className="max-w-2xl">
          <p className="text-sm font-semibold text-secondary">{t("freeNote")}</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-primary sm:text-4xl">
            {t("title")}
          </h1>
          <p className="mt-3 text-base leading-relaxed text-text/70">{t("subtitle")}</p>
        </div>

        {/* Split: search + result side by side */}
        <div className="mt-8 grid gap-6 lg:grid-cols-2 lg:items-stretch lg:gap-8">
          {/* Left — how it works + search */}
          <div className="flex flex-col gap-6">
            <div className="rounded-2xl border border-primary/10 bg-surface p-5 sm:p-6">
              <h2 className="text-sm font-bold uppercase tracking-wide text-text/50">
                {t("howTitle")}
              </h2>
              <ol className="mt-4 space-y-4">
                {steps.map((step, i) => (
                  <li key={step.title} className="flex gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold text-white">
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-primary">{step.title}</p>
                      <p className="mt-0.5 text-sm leading-relaxed text-text/60">{step.text}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <form
              onSubmit={submit}
              className="rounded-2xl border border-primary/10 bg-surface p-5 sm:p-6"
            >
              <label htmlFor="parcel-ref" className="text-sm font-semibold text-primary">
                {t("inputLabel")}
              </label>
              <div className="relative mt-2">
                <Search
                  className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text/40"
                  strokeWidth={2}
                />
                <input
                  id="parcel-ref"
                  value={ref}
                  onChange={(e) => setRef(e.target.value.toUpperCase())}
                  placeholder={t("placeholder")}
                  required
                  minLength={3}
                  autoComplete="off"
                  spellCheck={false}
                  className="w-full rounded-xl border border-primary/15 bg-background py-3 pl-10 pr-4 font-mono text-sm text-primary placeholder:text-text/35 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20 sm:text-base"
                />
              </div>

              <button
                type="submit"
                disabled={loading || ref.trim().length < 3}
                className="mt-4 w-full rounded-xl bg-secondary py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45 sm:text-base"
              >
                {loading ? (
                  <span className="inline-flex items-center justify-center gap-2">
                    <Spinner className="h-4 w-4 border-white/30 border-t-white" />
                    {t("searching")}
                  </span>
                ) : (
                  t("button")
                )}
              </button>

              <p className="mt-4 text-xs text-text/50">{t("tryExample")}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {EXAMPLE_REFS.map((example) => (
                  <button
                    key={example}
                    type="button"
                    disabled={loading}
                    onClick={() => runSearch(example)}
                    className="rounded-lg border border-primary/10 bg-background px-2.5 py-1 font-mono text-xs text-primary hover:border-secondary/40 cursor-pointer disabled:opacity-50"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </form>
          </div>

          {/* Right — result panel (always in view on desktop) */}
          <div
            className="flex min-h-[20rem] flex-col rounded-2xl border border-primary/10 bg-surface p-5 sm:min-h-[24rem] sm:p-6 lg:sticky lg:top-20 lg:min-h-0 lg:self-start"
            aria-live="polite"
          >
            {error && <Alert tone="error">{error}</Alert>}

            {loading && (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
                <Spinner className="h-8 w-8" />
                <p className="text-sm text-text/60">{t("searching")}</p>
              </div>
            )}

            {!loading && result && style && (
              <div className="flex flex-1 flex-col">
                <div
                  className={`rounded-xl border p-4 ${style.border} ${style.bg}`}
                >
                  <div className="flex items-start gap-3">
                    <StatusIcon className={`h-8 w-8 shrink-0 ${style.iconColor}`} strokeWidth={1.8} />
                    <div className="min-w-0">
                      <p className="text-lg font-bold text-primary">{statusLabel}</p>
                      <p className="mt-1 font-mono text-sm font-semibold text-primary/80">
                        {result.parcel_reference}
                      </p>
                    </div>
                  </div>
                  <p className="mt-4 text-sm leading-relaxed text-text/80">{statusMessage}</p>
                </div>

                {result.found && (
                  <dl className="mt-4 space-y-2 border-t border-primary/10 pt-4 text-sm">
                    {result.region && (
                      <div className="flex justify-between gap-4">
                        <dt className="text-text/55">{t("region")}</dt>
                        <dd className="font-semibold text-primary">{result.region}</dd>
                      </div>
                    )}
                    {result.registration_year && (
                      <div className="flex justify-between gap-4">
                        <dt className="text-text/55">{t("registeredIn")}</dt>
                        <dd className="font-semibold text-primary">{result.registration_year}</dd>
                      </div>
                    )}
                  </dl>
                )}

                {result.found && resolveStatus(result) === "registered" && (
                  <div className="mt-auto border-t border-primary/10 pt-5">
                    <p className="text-sm font-semibold text-primary">{t("upgradeTitle")}</p>
                    <p className="mt-1 text-sm text-text/60">{t("upgradeText")}</p>
                    <Link
                      href="/pricing"
                      className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-secondary hover:underline"
                    >
                      {t("upgradeCta")}
                      <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
                    </Link>
                  </div>
                )}

                <p className="mt-4 text-xs text-text/45">{t("disclaimer")}</p>
              </div>
            )}

            {!loading && !result && !error && (
              <div className="flex flex-1 flex-col items-center justify-center text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent/80">
                  <ArrowRight className="hidden h-6 w-6 text-secondary/60 lg:block lg:-scale-x-100" />
                  <Search className="h-6 w-6 text-secondary/60 lg:hidden" strokeWidth={1.8} />
                </div>
                <p className="mt-4 text-base font-semibold text-primary">{t("panelIdleTitle")}</p>
                <p className="mt-2 max-w-xs text-sm leading-relaxed text-text/55">
                  {t("panelIdleText")}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
