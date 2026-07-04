"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { api } from "@/lib/api-client";
import type { Parcel } from "@/lib/types";
import { Badge, EmptyState, PageTitle, Spinner } from "@/components/ui";

const ParcelMap = dynamic(() => import("@/components/map/ParcelMap"), { ssr: false });

export default function MarketplacePage() {
  const t = useTranslations("marketplace");
  const [parcels, setParcels] = useState<Parcel[] | null>(null);

  useEffect(() => {
    api<{ items: Parcel[] }>("/parcels?for_sale=true&limit=100", { auth: false })
      .then((data) => setParcels(data.items))
      .catch(() => setParcels([]));
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
      <PageTitle title={t("title")} subtitle={t("subtitle")} />

      {parcels === null ? (
        <div className="flex justify-center py-20">
          <Spinner className="h-8 w-8" />
        </div>
      ) : parcels.length === 0 ? (
        <EmptyState>{t("empty")}</EmptyState>
      ) : (
        <div className="grid gap-8 lg:grid-cols-5">
          <div className="space-y-4 lg:col-span-2 lg:max-h-[36rem] lg:overflow-y-auto lg:pr-2">
            {parcels.map((p) => (
              <div key={p.id} className="rounded-xl border border-text/10 p-5">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-mono font-semibold text-primary">
                    {p.parcel_reference}
                  </span>
                  <Badge color="accent">{p.region}</Badge>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-text/60">{t("price")}</dt>
                    <dd className="font-semibold text-secondary">
                      {p.listing?.price_xaf
                        ? `${Number(p.listing.price_xaf).toLocaleString()} XAF`
                        : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-text/60">{t("area")}</dt>
                    <dd className="font-medium text-primary">
                      {p.area_sqm ? `${p.area_sqm.toLocaleString()} m²` : "—"}
                    </dd>
                  </div>
                </dl>
                {p.listing?.expires_at && (
                  <p className="mt-2 text-xs text-text/60">
                    {t("listedUntil")}{" "}
                    {new Date(p.listing.expires_at).toLocaleDateString()}
                  </p>
                )}
                <Link
                  href="/login"
                  className="mt-3 inline-block text-sm font-medium text-secondary hover:underline"
                >
                  {t("inquire")} →
                </Link>
              </div>
            ))}
          </div>
          <div className="lg:col-span-3">
            <ParcelMap parcels={parcels} className="h-96 w-full rounded-xl lg:h-[36rem]" />
          </div>
        </div>
      )}
    </div>
  );
}
