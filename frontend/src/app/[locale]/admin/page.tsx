"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { api } from "@/lib/api-client";
import { Card, PageTitle, Spinner } from "@/components/ui";

interface Metrics {
  total_users: number;
  kyc_pending: number;
  flagged_documents: number;
  active_subscriptions: number;
  total_parcels: number;
  active_listings: number;
  open_disputes: number;
  waitlist_count: number;
  monthly_revenue: Record<string, { total_xaf: number; count: number }>;
}

export default function AdminDashboard() {
  const t = useTranslations("adminPanel.metrics");
  const [metrics, setMetrics] = useState<Metrics | null>(null);

  useEffect(() => {
    api<Metrics>("/admin/dashboard").then(setMetrics).catch(() => {});
  }, []);

  if (!metrics) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  const cards: { label: string; value: number; alert?: boolean }[] = [
    { label: t("totalUsers"), value: metrics.total_users },
    { label: t("kycPending"), value: metrics.kyc_pending, alert: metrics.kyc_pending > 0 },
    { label: t("flaggedDocs"), value: metrics.flagged_documents, alert: metrics.flagged_documents > 0 },
    { label: t("activeSubs"), value: metrics.active_subscriptions },
    { label: t("totalParcels"), value: metrics.total_parcels },
    { label: t("activeListings"), value: metrics.active_listings },
    { label: t("openDisputes"), value: metrics.open_disputes, alert: metrics.open_disputes > 0 },
    { label: t("waitlist"), value: metrics.waitlist_count },
  ];

  const revenueTotal = Object.values(metrics.monthly_revenue).reduce(
    (sum, r) => sum + r.total_xaf,
    0,
  );

  return (
    <div className="mx-auto max-w-6xl">
      <PageTitle title="Dashboard" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <p className="text-xs font-semibold uppercase text-text/60">{c.label}</p>
            <p className={`mt-2 text-3xl font-extrabold ${c.alert ? "text-secondary" : "text-primary"}`}>
              {c.value.toLocaleString()}
            </p>
          </Card>
        ))}
      </div>
      <Card className="mt-6">
        <p className="text-xs font-semibold uppercase text-text/60">{t("monthlyRevenue")}</p>
        <p className="mt-2 text-3xl font-extrabold text-primary">
          {revenueTotal.toLocaleString()} <span className="text-base font-normal">XAF</span>
        </p>
        <div className="mt-3 flex gap-6 text-sm text-text/70">
          {Object.entries(metrics.monthly_revenue).map(([type, r]) => (
            <span key={type}>
              {type}: <strong>{r.total_xaf.toLocaleString()} XAF</strong> ({r.count})
            </span>
          ))}
        </div>
      </Card>
    </div>
  );
}
