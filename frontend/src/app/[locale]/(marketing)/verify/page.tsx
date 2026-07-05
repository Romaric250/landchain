"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  MapPin,
  Search,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { api, errorMessage } from "@/lib/api-client";
import type { QuickVerifyResult } from "@/lib/types";
import { PageHero } from "@/components/marketing/PageHero";
import { Reveal } from "@/components/ui/Reveal";
import { Alert, Badge, Button, Spinner, VerifyResultSkeleton, statusColor } from "@/components/ui";

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

  const features = t.raw("features") as string[];

  const StatusIcon =
    !result?.found
      ? XCircle
      : result.status === "disputed" || result.status === "flagged"
        ? AlertTriangle
        : CheckCircle2;

  const statusAccent =
    !result?.found
      ? "text-red-400"
      : result.status === "disputed" || result.status === "flagged"
        ? "text-amber-400"
        : "text-emerald-400";

  return (
    <>
      <PageHero
        kicker={t("heroKicker")}
        title={t("title")}
        subtitle={t("subtitle")}
        image="https://images.unsplash.com/photo-1454165804603-c06757b7f825?auto=format&fit=crop&w=1920&q=80"
        compact
      >
        <form
          onSubmit={submit}
          className="flex max-w-2xl flex-col gap-3 rounded-2xl border border-white/15 bg-white/10 p-2 backdrop-blur-md sm:flex-row sm:items-center"
        >
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/50" />
            <input
              value={ref}
              onChange={(e) => setRef(e.target.value)}
              placeholder={t("placeholder")}
              required
              minLength={3}
              aria-label={t("placeholder")}
              className="w-full rounded-xl border-0 bg-transparent py-4 pl-12 pr-4 text-base text-white placeholder:text-white/45 focus:outline-none focus:ring-2 focus:ring-secondary/60"
            />
          </div>
          <Button
            type="submit"
            variant="secondary"
            size="lg"
            disabled={loading}
            className="shrink-0 rounded-xl px-8"
          >
            {loading ? <Spinner /> : t("button")}
          </Button>
        </form>
        <div className="mt-5 flex flex-wrap gap-2">
          {features.map((f) => (
            <span
              key={f}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-white/70"
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-secondary" strokeWidth={2} />
              {f}
            </span>
          ))}
        </div>
      </PageHero>

      <section className="bg-background">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
          {error && (
            <Reveal>
              <Alert tone="error">{error}</Alert>
            </Reveal>
          )}

          {loading && (
            <Reveal>
              <VerifyResultSkeleton />
            </Reveal>
          )}

          {result && !loading && (
            <Reveal>
              <div className="overflow-hidden rounded-2xl border border-primary/10 bg-surface shadow-xl shadow-primary/5">
                <div className="border-b border-primary/10 bg-primary px-6 py-5 sm:px-8">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <StatusIcon className={`h-8 w-8 ${statusAccent}`} strokeWidth={1.8} />
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-white/50">
                          {t("resultLabel")}
                        </p>
                        <h2 className="font-mono text-lg font-bold text-white sm:text-xl">
                          {result.parcel_reference}
                        </h2>
                      </div>
                    </div>
                    <Badge color={statusColor(result.status)}>
                      {tc(`status.${result.status}`)}
                    </Badge>
                  </div>
                </div>

                <div className="p-6 sm:p-8">
                  <p
                    className={`text-sm leading-relaxed sm:text-base ${
                      result.status === "disputed" || result.status === "flagged"
                        ? "text-red-700"
                        : result.found
                          ? "text-text/80"
                          : "text-text/70"
                    }`}
                  >
                    {statusMessage}
                  </p>

                  {result.found && (
                    <dl className="mt-6 grid gap-4 sm:grid-cols-2">
                      <div className="flex items-start gap-3 rounded-xl bg-accent/50 p-4">
                        <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-secondary" strokeWidth={1.8} />
                        <div>
                          <dt className="text-xs font-semibold uppercase tracking-wide text-text/50">
                            {t("region")}
                          </dt>
                          <dd className="mt-0.5 font-semibold text-primary">{result.region}</dd>
                        </div>
                      </div>
                      {result.registration_year && (
                        <div className="flex items-start gap-3 rounded-xl bg-accent/50 p-4">
                          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-secondary" strokeWidth={1.8} />
                          <div>
                            <dt className="text-xs font-semibold uppercase tracking-wide text-text/50">
                              {t("registeredIn")}
                            </dt>
                            <dd className="mt-0.5 font-semibold text-primary">
                              {result.registration_year}
                            </dd>
                          </div>
                        </div>
                      )}
                    </dl>
                  )}

                  <div className="mt-8 rounded-xl border border-secondary/20 bg-gradient-to-br from-secondary/10 to-accent/30 p-6">
                    <h3 className="flex items-center gap-2 font-bold text-primary">
                      <ShieldCheck className="h-5 w-5 text-secondary" strokeWidth={1.8} />
                      {t("upgradeTitle")}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-text/70">{t("upgradeText")}</p>
                    <Link
                      href="/pricing"
                      className="mt-4 inline-flex items-center gap-2 rounded-full bg-secondary px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-secondary/25 transition-transform hover:scale-[1.02]"
                    >
                      {t("upgradeCta")}
                      <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
                    </Link>
                  </div>
                </div>
              </div>
            </Reveal>
          )}

          {!result && !error && !loading && (
            <Reveal delay={100}>
              <div className="rounded-2xl border border-dashed border-primary/15 bg-surface/80 p-10 text-center">
                <Search className="mx-auto h-10 w-10 text-text/25" strokeWidth={1.5} />
                <p className="mt-4 text-sm text-text/60">{t("searchHint")}</p>
              </div>
            </Reveal>
          )}
        </div>
      </section>
    </>
  );
}
