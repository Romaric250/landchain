"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth";
import { api, errorMessage } from "@/lib/api-client";
import type { Payment, PlanInfo } from "@/lib/types";
import { Alert, Badge, Button, Card, EmptyState, PageTitle, Spinner, statusColor } from "@/components/ui";

export default function SubscriptionPage() {
  const t = useTranslations("subscription");
  const tp = useTranslations("pricing");
  const { user, refreshUser } = useAuth();
  const [plans, setPlans] = useState<PlanInfo[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [busyPlan, setBusyPlan] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState<string | null>(null);

  useEffect(() => {
    api<{ subscription_plans: PlanInfo[] }>("/payments/plans", { auth: false })
      .then((d) => setPlans(d.subscription_plans))
      .catch(() => {});
    loadHistory();
  }, []);

  function loadHistory() {
    api<{ items: Payment[] }>("/payments/history")
      .then((d) => setPayments(d.items))
      .catch(() => {});
  }

  async function subscribe(plan: string) {
    setBusyPlan(plan);
    setError("");
    try {
      const res = await api<{ link: string }>("/payments/subscribe", {
        method: "POST",
        body: { plan },
      });
      window.location.href = res.link;
    } catch (err) {
      setError(errorMessage(err));
      setBusyPlan(null);
    }
  }

  async function checkStatus(transId: string) {
    setChecking(transId);
    try {
      await api(`/payments/${transId}/status`);
      loadHistory();
      await refreshUser();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setChecking(null);
    }
  }

  const sub = user?.subscription;
  const subActive =
    sub?.status === "active" && sub.expires_at && new Date(sub.expires_at) > new Date();

  return (
    <div className="mx-auto max-w-4xl">
      <PageTitle title={t("title")} subtitle={t("manualNote")} />

      <Card className="mb-8">
        <h2 className="text-sm font-semibold uppercase text-text/60">{t("current")}</h2>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <span className="text-xl font-bold capitalize text-primary">
            {sub?.plan ?? "—"}
          </span>
          <Badge color={subActive ? "green" : "gray"}>
            {subActive
              ? `${new Date(sub!.expires_at!).toLocaleDateString()}`
              : sub?.status ?? "none"}
          </Badge>
        </div>
      </Card>

      {error && <div className="mb-6"><Alert tone="error">{error}</Alert></div>}

      <h2 className="mb-4 text-lg font-semibold text-primary">{t("renew")}</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        {plans.map((plan) => (
          <Card key={plan.plan} className="flex flex-col">
            <h3 className="font-semibold capitalize text-primary">
              {tp(`plans.${plan.plan}.title`)}
            </h3>
            <p className="mt-2 text-2xl font-extrabold text-primary">
              {plan.price_xaf.toLocaleString()}
              <span className="text-sm font-normal text-text/60"> XAF</span>
            </p>
            <p className="text-xs text-text/60">{plan.duration_days} days</p>
            <Button
              className="mt-4"
              variant="secondary"
              disabled={busyPlan !== null}
              onClick={() => subscribe(plan.plan)}
            >
              {busyPlan === plan.plan ? <Spinner /> : t("payNow")}
            </Button>
          </Card>
        ))}
      </div>

      <h2 className="mb-4 mt-10 text-lg font-semibold text-primary">{t("history")}</h2>
      {payments.length === 0 ? (
        <EmptyState>—</EmptyState>
      ) : (
        <div className="space-y-2">
          {payments.map((p) => (
            <Card key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div>
                <p className="text-sm font-medium text-primary">
                  {p.type === "subscription" ? `Subscription (${p.related_id})` : "Listing fee"} —{" "}
                  {p.amount_xaf.toLocaleString()} XAF
                </p>
                <p className="font-mono text-xs text-text/60">{p.fapshi_trans_id}</p>
                <p className="text-xs text-text/60">{new Date(p.created_at).toLocaleString()}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge color={statusColor(p.status)}>{p.status}</Badge>
                {p.status === "PENDING" && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={checking === p.fapshi_trans_id}
                    onClick={() => checkStatus(p.fapshi_trans_id)}
                  >
                    {checking === p.fapshi_trans_id ? <Spinner /> : t("checkStatus")}
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
