"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  MapPin,
  Search,
  ShieldCheck,
  Sparkles,
  XCircle,
  Zap,
} from "lucide-react";
import { api, errorMessage } from "@/lib/api-client";
import type { QuickVerifyResult } from "@/lib/types";
import { LandChainLogo } from "@/components/marketing/LandChainLogo";
import { PageHero } from "@/components/marketing/PageHero";
import { Reveal } from "@/components/ui/Reveal";
import { Alert, Badge, Spinner, VerifyResultSkeleton, statusColor } from "@/components/ui";

const EXAMPLE_REFS = ["LT-SMOKE-1783165312", "LT-2024-DLA-00871"];

const TRUST_ICONS = [ShieldCheck, Zap, Sparkles];

function statusConfig(result: QuickVerifyResult | null, t: ReturnType<typeof useTranslations>) {
  if (!result?.found) {
    return {
      label: t("statusNotFound"),
      Icon: XCircle,
      headerClass: "from-slate-800 to-slate-900",
      ringClass: "ring-red-500/30",
      iconClass: "text-red-400",
      badge: "red" as const,
    };
  }
  if (result.status === "disputed") {
    return {
      label: t("statusDisputed"),
      Icon: AlertTriangle,
      headerClass: "from-amber-900 to-primary",
      ringClass: "ring-amber-500/40",
      iconClass: "text-amber-400",
      badge: "yellow" as const,
    };
  }
  if (result.status === "flagged") {
    return {
      label: t("statusFlagged"),
      Icon: AlertTriangle,
      headerClass: "from-orange-900 to-primary",
      ringClass: "ring-orange-500/40",
      iconClass: "text-orange-400",
      badge: "yellow" as const,
    };
  }
  return {
    label: t("statusRegistered"),
    Icon: CheckCircle2,
    headerClass: "from-emerald-900 to-primary",
    ringClass: "ring-emerald-500/30",
    iconClass: "text-emerald-400",
    badge: "green" as const,
  };
}

export default function VerifyPage() {
  const t = useTranslations("verify");
  const tc = useTranslations("common");
  const [ref, setRef] = useState("");
  const [result, setResult] = useState<QuickVerifyResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const resultsRef = useRef<HTMLDivElement>(null);

  const features = t.raw("features") as string[];
  const trustItems = t.raw("trustItems") as { title: string; text: string }[];

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
      requestAnimationFrame(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
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

  const statusMessage = result?.found
    ? result.status === "disputed"
      ? t("foundDisputed")
      : result.status === "flagged"
        ? t("foundFlagged")
        : t("foundRegistered")
    : t("notFound");

  const cfg = statusConfig(result, t);
  const StatusIcon = cfg.Icon;

  return (
    <>
      <PageHero
        kicker={t("heroKicker")}
        title={
          <>
            {t("title")}
            <span className="mt-2 block text-secondary">{t("titleAccent")}</span>
          </>
        }
        subtitle={t("subtitle")}
        image="https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1920&q=80"
        compact
      >
        <div className="flex flex-wrap gap-2">
          {features.map((f) => (
            <span
              key={f}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-white/75"
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-secondary" strokeWidth={2} />
              {f}
            </span>
          ))}
        </div>
      </PageHero>

      <section className="relative z-10 -mt-6 bg-background pb-16 sm:-mt-10 sm:pb-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:items-start">
            {/* Verification console */}
            <div className="mx-auto w-full max-w-2xl lg:max-w-none">
              <Reveal>
                <div className="overflow-hidden rounded-2xl border border-primary/10 bg-surface shadow-xl shadow-primary/5 lg:rounded-3xl">
                  <div className="flex items-center gap-3 border-b border-primary/10 bg-primary px-5 py-4 sm:px-6">
                    <LandChainLogo size={40} priority />
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-white/45">
                        {t("consoleSubtitle")}
                      </p>
                      <p className="truncate font-semibold text-white">{t("consoleTitle")}</p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-300">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                      {t("liveBadge")}
                    </span>
                  </div>

                  <form onSubmit={submit} className="p-5 sm:p-6">
                    <label htmlFor="parcel-ref" className="text-xs font-semibold uppercase tracking-wide text-text/50">
                      {tc("search")}
                    </label>
                    <div className="relative mt-2">
                      <Search
                        className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-text/35"
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
                        className="w-full rounded-xl border-2 border-primary/10 bg-background py-3.5 pl-12 pr-4 font-mono text-base text-primary placeholder:text-text/35 transition-colors focus:border-secondary focus:outline-none focus:ring-4 focus:ring-secondary/15 sm:text-lg"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading || ref.trim().length < 3}
                      className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-secondary py-3.5 text-sm font-semibold text-white shadow-lg shadow-secondary/25 transition-all hover:scale-[1.01] hover:shadow-secondary/35 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100 sm:text-base"
                    >
                      {loading ? (
                        <>
                          <Spinner className="h-5 w-5 border-white/30 border-t-white" />
                          {t("searching")}
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="h-5 w-5" strokeWidth={2} />
                          {t("button")}
                        </>
                      )}
                    </button>

                    <p className="mt-5 text-xs font-medium text-text/50">{t("tryExample")}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {EXAMPLE_REFS.map((example) => (
                        <button
                          key={example}
                          type="button"
                          disabled={loading}
                          onClick={() => runSearch(example)}
                          className="rounded-lg border border-primary/10 bg-background px-3 py-1.5 font-mono text-xs text-primary transition-colors hover:border-secondary/40 hover:bg-accent/40 disabled:opacity-50 cursor-pointer"
                        >
                          {example}
                        </button>
                      ))}
                    </div>
                  </form>
                </div>
              </Reveal>

              {/* Results */}
              <div ref={resultsRef} className="mt-6 scroll-mt-24">
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
                    <div
                      className={`overflow-hidden rounded-2xl border border-primary/10 bg-surface shadow-xl ring-2 ${cfg.ringClass}`}
                    >
                      <div className={`bg-gradient-to-r px-5 py-5 sm:px-6 ${cfg.headerClass}`}>
                        <div className="flex flex-wrap items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm">
                              <StatusIcon className={`h-7 w-7 ${cfg.iconClass}`} strokeWidth={1.8} />
                            </div>
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-widest text-white/45">
                                {t("resultLabel")}
                              </p>
                              <h2 className="font-mono text-lg font-bold text-white sm:text-xl">
                                {result.parcel_reference}
                              </h2>
                            </div>
                          </div>
                          <Badge color={statusColor(result.status)}>{cfg.label}</Badge>
                        </div>
                      </div>

                      <div className="p-5 sm:p-6">
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
                          <dl className="mt-5 grid gap-3 sm:grid-cols-2">
                            <div className="flex items-start gap-3 rounded-xl border border-primary/8 bg-accent/40 p-4">
                              <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-secondary" strokeWidth={1.8} />
                              <div>
                                <dt className="text-[10px] font-semibold uppercase tracking-wide text-text/50">
                                  {t("region")}
                                </dt>
                                <dd className="mt-0.5 font-semibold text-primary">{result.region}</dd>
                              </div>
                            </div>
                            {result.registration_year && (
                              <div className="flex items-start gap-3 rounded-xl border border-primary/8 bg-accent/40 p-4">
                                <Clock className="mt-0.5 h-5 w-5 shrink-0 text-secondary" strokeWidth={1.8} />
                                <div>
                                  <dt className="text-[10px] font-semibold uppercase tracking-wide text-text/50">
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

                        <div className="mt-6 rounded-xl border border-secondary/20 bg-gradient-to-br from-secondary/10 to-accent/30 p-5">
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

                        <p className="mt-4 text-center text-[11px] text-text/45">{t("disclaimer")}</p>
                      </div>
                    </div>
                  </Reveal>
                )}

                {!result && !error && !loading && (
                  <Reveal delay={80}>
                    <div className="rounded-2xl border border-dashed border-primary/15 bg-surface/80 p-8 text-center sm:p-10">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/60">
                        <Search className="h-7 w-7 text-secondary/70" strokeWidth={1.5} />
                      </div>
                      <p className="mt-4 font-semibold text-primary">{t("emptyTitle")}</p>
                      <p className="mt-2 text-sm text-text/55">{t("emptyText")}</p>
                    </div>
                  </Reveal>
                )}
              </div>
            </div>

            {/* Trust sidebar — desktop */}
            <aside className="hidden lg:block">
              <Reveal delay={120}>
                <div className="sticky top-24 rounded-2xl border border-primary/10 bg-surface p-6 shadow-sm">
                  <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-primary">
                    <ShieldCheck className="h-4 w-4 text-secondary" strokeWidth={2} />
                    {t("trustTitle")}
                  </h2>
                  <ul className="mt-5 space-y-5">
                    {trustItems.map((item, i) => {
                      const Icon = TRUST_ICONS[i % TRUST_ICONS.length];
                      return (
                        <li key={item.title} className="flex gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary/10 text-secondary">
                            <Icon className="h-4 w-4" strokeWidth={2} />
                          </span>
                          <div>
                            <p className="text-sm font-semibold text-primary">{item.title}</p>
                            <p className="mt-0.5 text-xs leading-relaxed text-text/60">{item.text}</p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </Reveal>
            </aside>
          </div>

          {/* Trust strip — mobile */}
          <div className="mt-10 grid gap-4 sm:grid-cols-3 lg:hidden">
            {trustItems.map((item, i) => {
              const Icon = TRUST_ICONS[i % TRUST_ICONS.length];
              return (
                <Reveal key={item.title} delay={i * 60}>
                  <div className="rounded-xl border border-primary/10 bg-surface p-4">
                    <Icon className="h-5 w-5 text-secondary" strokeWidth={2} />
                    <p className="mt-2 text-sm font-semibold text-primary">{item.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-text/60">{item.text}</p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}
