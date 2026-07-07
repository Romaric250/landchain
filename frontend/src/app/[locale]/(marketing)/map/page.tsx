"use client";

import { ExploreMap } from "@/components/map/ExploreMap";
import { useTranslations } from "next-intl";

/** Public full-page explore map — no login required. */
export default function PublicMapPage() {
  const t = useTranslations("mapPage");

  return (
    <div className="flex min-h-[calc(100svh-4.5rem)] flex-col">
      <div className="border-b border-text/10 bg-surface px-4 py-4 sm:px-6">
        <h1 className="text-2xl font-bold text-primary">{t("title")}</h1>
        <p className="mt-1 text-sm text-text/70">{t("publicSubtitle")}</p>
      </div>
      <div className="flex-1 p-4 sm:p-6">
        <ExploreMap fullPage />
      </div>
    </div>
  );
}
