"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { api } from "@/lib/api-client";
import { Alert, Spinner } from "@/components/ui";

function VerifyEmailInner() {
  const t = useTranslations("auth");
  const tc = useTranslations("common");
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [state, setState] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    if (!token) {
      setState("error");
      return;
    }
    api(`/auth/verify-email?token=${encodeURIComponent(token)}`, { auth: false })
      .then(() => setState("success"))
      .catch(() => setState("error"));
  }, [token]);

  return (
    <>
      <h1 className="text-2xl font-bold text-primary">{t("verifyEmailTitle")}</h1>
      <div className="mt-6">
        {state === "loading" && (
          <div className="flex items-center gap-3 text-sm text-text/70">
            <Spinner /> {t("verifyEmailChecking")}
          </div>
        )}
        {state === "success" && (
          <div className="space-y-4">
            <Alert tone="success">{t("verifyEmailSuccess")}</Alert>
            <p className="text-center text-sm">
              <Link href="/login" className="font-medium text-secondary hover:underline">
                {tc("login")}
              </Link>
            </p>
          </div>
        )}
        {state === "error" && (
          <div className="space-y-4">
            <Alert tone="error">{t("verifyEmailError")}</Alert>
            <p className="text-center text-sm text-text/70">
              {t("verifyEmailResendHint")}{" "}
              <Link href="/login" className="font-medium text-secondary hover:underline">
                {tc("login")}
              </Link>
            </p>
          </div>
        )}
      </div>
    </>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <VerifyEmailInner />
    </Suspense>
  );
}
