"use client";

import { ExploreMap } from "@/components/map/ExploreMap";
import { PageTitle } from "@/components/ui";
import { useTranslations } from "next-intl";

export default function DashboardMapPage() {
  const t = useTranslations("mapPage");

  return (
    <div className="-mx-4 -my-6 flex h-[calc(100vh-0px)] flex-col sm:-mx-6 lg:-mx-10 lg:-my-10">
      <div className="shrink-0 px-4 pb-3 pt-1 sm:px-6 lg:px-10 lg:pt-4">
        <PageTitle title={t("title")} subtitle={t("subtitle")} />
      </div>
      <div className="min-h-0 flex-1 px-4 pb-4 sm:px-6 lg:px-10 lg:pb-6">
        <ExploreMap className="h-full" />
      </div>
    </div>
  );
}
