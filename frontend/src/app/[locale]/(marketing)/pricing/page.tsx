"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { api } from "@/lib/api-client";
import type { PlanInfo } from "@/lib/types";
import { Badge, PricingCardsSkeleton } from "@/components/ui";

interface PlansResponse {
  subscription_plans: PlanInfo[];
  listing_fee_xaf: number;
  listing_duration_days: number;
}

export default function PricingPage() {
  const t = useTranslations("pricing");
  const [plans, setPlans] = useState<PlansResponse | null>(null);

  useEffect(() => {
    api<PlansResponse>("/payments/plans", { auth: false })
      .then(setPlans)
      .catch(() => setPlans(null));
  }, []);

  const features = t.raw("subscriptionFeatures") as string[];
  const freeFeatures = t.raw("free.features") as string[];

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <h1 className="text-center text-3xl font-bold text-primary sm:text-4xl">{t("title")}</h1>
      <p className="mx-auto mt-2 max-w-2xl text-center text-text/70">{t("subtitle")}</p>

      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Free tier */}
        <div className="flex flex-col rounded-2xl border border-text/10 p-6">
          <h2 className="text-lg font-semibold text-primary">{t("free.title")}</h2>
          <div className="mt-4 text-3xl font-extrabold text-primary">
            {t("free.price")} <span className="text-sm font-normal text-text/60">XAF</span>
          </div>
          <ul className="mt-6 flex-1 space-y-2 text-sm text-text/80">
            {freeFeatures.map((f) => (
              <li key={f} className="flex gap-2">
                <span className="text-secondary">✓</span> {f}
              </li>
            ))}
          </ul>
          <Link
            href="/verify"
            className="mt-6 rounded-lg border border-primary/30 px-4 py-2 text-center text-sm font-medium text-primary hover:bg-primary/5"
          >
            {t("free.cta")}
          </Link>
        </div>

        {/* Paid plans */}
        {plans === null ? (
          <PricingCardsSkeleton />
        ) : (
          (["monthly", "quarterly", "annual"] as const).map((plan) => {
          const info = plans.subscription_plans.find((p) => p.plan === plan);
          const highlighted = plan === "quarterly";
          return (
            <div
              key={plan}
              className={`flex flex-col rounded-2xl border p-6 ${
                highlighted ? "border-secondary bg-accent/30 shadow-md" : "border-text/10"
              }`}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-primary">{t(`plans.${plan}.title`)}</h2>
                {plan !== "monthly" && <Badge color="accent">{t(`plans.${plan}.badge`)}</Badge>}
              </div>
              <div className="mt-4 text-3xl font-extrabold text-primary">
                {info ? info.price_xaf.toLocaleString() : "—"}
                <span className="text-sm font-normal text-text/60">
                  {" "}
                  XAF {t(`plans.${plan}.period`)}
                </span>
              </div>
              <ul className="mt-6 flex-1 space-y-2 text-sm text-text/80">
                {features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <span className="text-secondary">✓</span> {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/dashboard/subscription"
                className={`mt-6 rounded-lg px-4 py-2 text-center text-sm font-medium ${
                  highlighted
                    ? "bg-secondary text-background hover:opacity-90"
                    : "bg-primary text-background hover:opacity-90"
                }`}
              >
                {t("subscribe")}
              </Link>
            </div>
          );
        })
        )}
      </div>

      <p className="mt-6 text-center text-sm text-text/60">{t("manualRenewal")}</p>

      {/* Listing fee */}
      <div className="mt-12 flex flex-col items-center gap-4 rounded-2xl bg-primary p-8 text-background sm:flex-row sm:justify-between">
        <div>
          <h2 className="text-xl font-bold">{t("listing.title")}</h2>
          <p className="mt-1 opacity-80">
            {t("listing.text", { days: plans?.listing_duration_days ?? 60 })}
          </p>
        </div>
        <div className="text-center">
          <div className="text-3xl font-extrabold">
            {plans ? plans.listing_fee_xaf.toLocaleString() : "—"}{" "}
            <span className="text-sm font-normal opacity-70">XAF</span>
          </div>
          <Link
            href="/dashboard/parcels"
            className="mt-3 inline-block rounded-lg bg-secondary px-5 py-2 text-sm font-medium hover:opacity-90"
          >
            {t("listing.cta")}
          </Link>
        </div>
      </div>

      <p className="mt-8 text-center text-sm text-text/60">{t("payment")}</p>
    </div>
  );
}
