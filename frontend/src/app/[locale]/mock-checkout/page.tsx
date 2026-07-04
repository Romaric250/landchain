"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { API_BASE } from "@/lib/api-client";
import { Alert, Button, Card, Spinner } from "@/components/ui";

/** Development-only page simulating Fapshi's hosted checkout when the
 *  gateway is not configured. Fires the backend webhook with the mock secret. */
function MockCheckoutInner() {
  const t = useTranslations("mockCheckout");
  const tc = useTranslations("common");
  const searchParams = useSearchParams();
  const transId = searchParams.get("transId") ?? "";
  const amount = searchParams.get("amount") ?? "0";
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");

  async function simulate(status: "SUCCESSFUL" | "FAILED") {
    setState("loading");
    try {
      const res = await fetch(`${API_BASE}/payments/webhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-wh-secret": "mock-secret" },
        body: JSON.stringify({ transId, status, amount: Number(amount) }),
      });
      setState(res.ok ? "done" : "error");
    } catch {
      setState("error");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-accent/20 px-4">
      <Card className="w-full max-w-md">
        <h1 className="text-xl font-bold text-primary">{t("title")}</h1>
        <p className="mt-1 text-sm text-text/70">{t("subtitle")}</p>
        <p className="mt-4 font-mono text-sm text-text/80">
          {transId} — {Number(amount).toLocaleString()} XAF
        </p>
        {state === "done" ? (
          <div className="mt-6 space-y-4">
            <Alert tone="success">{t("done")}</Alert>
            <Link href="/dashboard" className="block text-center text-sm font-medium text-secondary hover:underline">
              {tc("dashboard")} →
            </Link>
          </div>
        ) : (
          <div className="mt-6 flex flex-col gap-3">
            <Button onClick={() => simulate("SUCCESSFUL")} disabled={state === "loading"}>
              {state === "loading" ? <Spinner /> : t("success")}
            </Button>
            <Button variant="danger" onClick={() => simulate("FAILED")} disabled={state === "loading"}>
              {t("fail")}
            </Button>
            {state === "error" && <Alert tone="error">{tc("error")}</Alert>}
          </div>
        )}
      </Card>
    </div>
  );
}

export default function MockCheckoutPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <MockCheckoutInner />
    </Suspense>
  );
}
