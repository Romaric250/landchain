"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { Header } from "@/components/marketing/Header";
import { Footer } from "@/components/marketing/Footer";
import { api } from "@/lib/api-client";
import type { Parcel } from "@/lib/types";
import { Input, PageTitle } from "@/components/ui";

const ParcelMap = dynamic(() => import("@/components/map/ParcelMap"), { ssr: false });

export default function MapPage() {
  const t = useTranslations("mapPage");
  const tc = useTranslations("common");
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      const query = q ? `&q=${encodeURIComponent(q)}` : "";
      api<{ items: Parcel[] }>(`/parcels?limit=200${query}`)
        .then((d) => setParcels(d.items))
        .catch(() => {});
    }, 300);
    return () => clearTimeout(timer);
  }, [q]);

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-6">
        <PageTitle title={t("title")} subtitle={t("subtitle")} />
        <div className="mb-4 flex flex-wrap items-center gap-4">
          <div className="w-full sm:w-72">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={tc("search")}
              aria-label={tc("search")}
            />
          </div>
          <div className="flex items-center gap-4 text-xs text-text/70">
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-primary" /> {t("legend.registered")}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-secondary" /> {t("legend.forSale")}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-red-600" /> {t("legend.disputed")}
            </span>
          </div>
        </div>
        <ParcelMap parcels={parcels} className="h-[32rem] w-full rounded-xl border border-text/10" />
      </main>
      <Footer />
    </>
  );
}
