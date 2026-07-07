"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { api } from "@/lib/api-client";
import type { Parcel } from "@/lib/types";
import { Badge, Input, Modal, Spinner, statusColor } from "@/components/ui";

const ParcelMap = dynamic(() => import("@/components/map/ParcelMap"), { ssr: false });

interface ExploreMapProps {
  /** Full viewport height (public page) vs dashboard inset */
  fullPage?: boolean;
  className?: string;
}

export function ExploreMap({ fullPage = false, className = "" }: ExploreMapProps) {
  const t = useTranslations("mapPage");
  const tc = useTranslations("common");
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Parcel | null>(null);

  const load = useCallback(() => {
    const query = q ? `?q=${encodeURIComponent(q)}&limit=200` : "?limit=200";
    api<{ items: Parcel[] }>(`/parcels/map${query}`)
      .then((d) => setParcels(d.items))
      .catch(() => setParcels([]))
      .finally(() => setLoading(false));
  }, [q]);

  useEffect(() => {
    const timer = setTimeout(load, 300);
    return () => clearTimeout(timer);
  }, [load]);

  const mapHeight = fullPage ? "h-[calc(100svh-4rem)] min-h-[480px]" : "h-[calc(100vh-8rem)] min-h-[420px]";

  return (
    <div className={`relative ${className}`}>
      <div className={`relative overflow-hidden rounded-xl border border-text/10 ${mapHeight}`}>
        {loading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-surface/60 backdrop-blur-sm">
            <Spinner className="h-8 w-8" />
          </div>
        )}
        <ParcelMap
          parcels={parcels}
          onParcelClick={setSelected}
          className="absolute inset-0 h-full w-full"
          showPolygons
          interactive
        />

        {/* Search + legend overlay */}
        <div className="pointer-events-none absolute left-3 right-3 top-3 z-10 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="pointer-events-auto w-full max-w-xs rounded-xl border border-text/10 bg-surface/95 p-2 shadow-lg backdrop-blur-md">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={tc("search")}
              aria-label={tc("search")}
              className="border-0 bg-transparent"
            />
          </div>
          <div className="pointer-events-auto flex flex-wrap gap-2 rounded-xl border border-text/10 bg-surface/95 px-3 py-2 text-xs text-text/80 shadow-lg backdrop-blur-md">
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-sm bg-[#1e3a5f]" /> {t("legend.registered")}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-sm bg-[#b45309]" /> {t("legend.forSale")}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-sm bg-red-600" /> {t("legend.disputed")}
            </span>
          </div>
        </div>

        <p className="pointer-events-none absolute bottom-3 left-3 z-10 max-w-sm rounded-lg bg-primary/80 px-3 py-1.5 text-xs text-white backdrop-blur-sm">
          {t("viewOnly")}
        </p>
      </div>

      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.parcel_reference ?? ""} wide>
        {selected && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge color={statusColor(selected.status)}>{tc(`status.${selected.status}`)}</Badge>
              {selected.listing?.is_for_sale && selected.listing.status === "active" && (
                <Badge color="yellow">{t("forSale")}</Badge>
              )}
            </div>
            <dl className="grid gap-2 text-sm">
              <div className="flex justify-between gap-4 border-b border-text/10 pb-2">
                <dt className="text-text/60">{t("detail.region")}</dt>
                <dd className="font-medium text-primary">{selected.region}</dd>
              </div>
              {selected.area_sqm != null && (
                <div className="flex justify-between gap-4 border-b border-text/10 pb-2">
                  <dt className="text-text/60">{t("detail.area")}</dt>
                  <dd className="font-medium">{selected.area_sqm.toLocaleString()} m²</dd>
                </div>
              )}
              {selected.listing?.price_xaf && (
                <div className="flex justify-between gap-4 border-b border-text/10 pb-2">
                  <dt className="text-text/60">{t("detail.price")}</dt>
                  <dd className="font-semibold text-secondary">
                    {Number(selected.listing.price_xaf).toLocaleString()} XAF
                  </dd>
                </div>
              )}
            </dl>
            <p className="text-xs text-text/50">{t("detail.loginHint")}</p>
          </div>
        )}
      </Modal>
    </div>
  );
}
