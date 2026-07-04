"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api-client";
import type { Parcel, Payment } from "@/lib/types";
import { Alert, Badge, Card, EmptyState, PageTitle, statusColor } from "@/components/ui";

export default function DashboardHome() {
  const t = useTranslations("dashboard");
  const tc = useTranslations("common");
  const { user } = useAuth();
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);

  useEffect(() => {
    api<{ items: Parcel[] }>("/parcels/mine").then((d) => setParcels(d.items)).catch(() => {});
    api<{ items: Payment[] }>("/payments/history")
      .then((d) => setPayments(d.items.slice(0, 5)))
      .catch(() => {});
  }, []);

  if (!user) return null;
  const sub = user.subscription;
  const subActive =
    sub?.status === "active" && sub.expires_at && new Date(sub.expires_at) > new Date();

  return (
    <div className="mx-auto max-w-5xl">
      <PageTitle title={t("welcome", { name: user.name.split(" ")[0] })} />

      {user.kyc_status !== "verified" && (
        <div className="mb-6">
          <Alert tone="warning">
            {t("kycRequired")}{" "}
            <Link href="/onboarding/kyc" className="font-semibold underline">
              {t("completeKyc")}
            </Link>
          </Alert>
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        <Card>
          <h2 className="text-sm font-semibold uppercase text-text/60">{t("subscription")}</h2>
          <p className="mt-2 text-lg font-semibold text-primary">
            {subActive
              ? t("subActive", { date: new Date(sub!.expires_at!).toLocaleDateString() })
              : sub?.status === "expired"
                ? t("subExpired")
                : t("subNone")}
          </p>
          <Link
            href="/dashboard/subscription"
            className="mt-3 inline-block text-sm font-medium text-secondary hover:underline"
          >
            {t("viewPlans")} →
          </Link>
        </Card>

        <Card>
          <h2 className="text-sm font-semibold uppercase text-text/60">{t("myParcels")}</h2>
          <p className="mt-2 text-3xl font-extrabold text-primary">{parcels.length}</p>
          <Link
            href="/dashboard/parcels/new"
            className="mt-3 inline-block text-sm font-medium text-secondary hover:underline"
          >
            {t("registerParcel")} →
          </Link>
        </Card>
      </div>

      <h2 className="mb-3 mt-10 text-lg font-semibold text-primary">{t("myParcels")}</h2>
      {parcels.length === 0 ? (
        <EmptyState>{t("noParcels")}</EmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {parcels.map((p) => (
            <Link key={p.id} href={`/dashboard/parcels/${p.id}`}>
              <Card className="transition-shadow hover:shadow-md">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-mono font-semibold text-primary">{p.parcel_reference}</span>
                  <Badge color={statusColor(p.status)}>{tc(`status.${p.status}`)}</Badge>
                </div>
                <p className="mt-2 text-sm text-text/70">{p.region}</p>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <h2 className="mb-3 mt-10 text-lg font-semibold text-primary">{t("recentActivity")}</h2>
      {payments.length === 0 ? (
        <EmptyState>—</EmptyState>
      ) : (
        <div className="space-y-2">
          {payments.map((p) => (
            <Card key={p.id} className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium text-primary">
                  {p.type === "subscription" ? "Subscription" : "Listing fee"} —{" "}
                  {p.amount_xaf.toLocaleString()} XAF
                </p>
                <p className="text-xs text-text/60">
                  {new Date(p.created_at).toLocaleString()}
                </p>
              </div>
              <Badge color={statusColor(p.status)}>{p.status}</Badge>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
