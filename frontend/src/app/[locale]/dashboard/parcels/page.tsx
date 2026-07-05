"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { api } from "@/lib/api-client";
import type { Parcel } from "@/lib/types";
import { Badge, Button, Card, CardGridSkeleton, EmptyState, PageTitle, statusColor } from "@/components/ui";

export default function MyParcelsPage() {
  const t = useTranslations("dashboard");
  const tc = useTranslations("common");
  const [parcels, setParcels] = useState<Parcel[] | null>(null);

  useEffect(() => {
    api<{ items: Parcel[] }>("/parcels/mine")
      .then((d) => setParcels(d.items))
      .catch(() => setParcels([]));
  }, []);

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageTitle title={t("myParcels")} />
        <Link href="/dashboard/parcels/new">
          <Button>{t("registerParcel")}</Button>
        </Link>
      </div>

      {parcels === null ? (
        <CardGridSkeleton count={3} />
      ) : parcels.length === 0 ? (
        <EmptyState>{t("noParcels")}</EmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {parcels.map((p) => (
            <Link key={p.id} href={`/dashboard/parcels/${p.id}`}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-mono font-semibold text-primary">{p.parcel_reference}</span>
                  <Badge color={statusColor(p.status)}>{tc(`status.${p.status}`)}</Badge>
                </div>
                <p className="mt-2 text-sm text-text/70">{p.region}</p>
                <p className="mt-1 text-sm text-text/70">
                  {p.area_sqm ? `${p.area_sqm.toLocaleString()} m²` : ""}
                </p>
                {p.listing?.status === "active" && (
                  <Badge color="accent" className="mt-3">
                    {p.listing.price_xaf?.toLocaleString()} XAF
                  </Badge>
                )}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
