"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { CheckCircle2, XCircle } from "lucide-react";
import { API_BASE } from "@/lib/api-client";
import { Alert, Button, Card, Spinner } from "@/components/ui";
import { LandChainLogo } from "@/components/marketing/LandChainLogo";

function CheckoutInner() {
  const t = useTranslations("checkout");
  const tc = useTranslations("common");
  const searchParams = useSearchParams();
  const transId = searchParams.get("transId") ?? "";
  const amount = searchParams.get("amount") ?? "0";
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");

  async function completePayment(status: "SUCCESSFUL" | "FAILED") {
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
    <div className="flex min-h-screen flex-col items-center justify-center bg-accent/20 px-4 py-10">
      <LandChainLogo href="/" size={40} showName className="mb-8" />
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
            <Button onClick={() => completePayment("SUCCESSFUL")} disabled={state === "loading"}>
              {state === "loading" ? (
                <Spinner />
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" strokeWidth={2} />
                  {t("confirm")}
                </>
              )}
            </Button>
            <Button variant="outline" onClick={() => completePayment("FAILED")} disabled={state === "loading"}>
              <XCircle className="h-4 w-4" strokeWidth={2} />
              {t("cancel")}
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
      <CheckoutInner />
    </Suspense>
  );
}
