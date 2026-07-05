"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  ArrowRight,
  CheckCircle2,
  MapPin,
  Ruler,
  ShieldCheck,
  Tag,
} from "lucide-react";
import { api } from "@/lib/api-client";
import type { Parcel } from "@/lib/types";
import { PageHero } from "@/components/marketing/PageHero";
import { Reveal } from "@/components/ui/Reveal";
import { Spinner } from "@/components/ui";

const MarketplaceMap = dynamic(() => import("@/components/map/MarketplaceMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[28rem] items-center justify-center bg-primary">
      <Spinner className="h-10 w-10 border-white/20 border-t-secondary" />
    </div>
  ),
});

const SAMPLE_IMAGES = [
  "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=600&q=70",
  "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=600&q=70",
  "https://images.unsplash.com/photo-1501854140801-50d01698950b?auto=format&fit=crop&w=600&q=70",
];

export default function MarketplacePage() {
  const t = useTranslations("marketplace");
  const [parcels, setParcels] = useState<Parcel[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [regionFilter, setRegionFilter] = useState("all");

  useEffect(() => {
    api<{ items: Parcel[] }>("/parcels?for_sale=true&limit=100", { auth: false })
      .then((data) => setParcels(data.items))
      .catch(() => setParcels([]));
  }, []);

  const regions = useMemo(() => {
    if (!parcels) return [];
    return [...new Set(parcels.map((p) => p.region).filter(Boolean))].sort();
  }, [parcels]);

  const filtered = useMemo(() => {
    if (!parcels) return [];
    if (regionFilter === "all") return parcels;
    return parcels.filter((p) => p.region === regionFilter);
  }, [parcels, regionFilter]);

  const selected = filtered.find((p) => p.id === selectedId) ?? filtered[0] ?? null;

  useEffect(() => {
    if (filtered.length && !filtered.some((p) => p.id === selectedId)) {
      setSelectedId(filtered[0].id);
    }
  }, [filtered, selectedId]);

  return (
    <>
      <PageHero
        kicker={t("heroKicker")}
        title={t("title")}
        subtitle={t("subtitle")}
        image="https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1920&q=80"
        compact
      >
        {parcels !== null && (
          <div className="flex flex-wrap items-center gap-4">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur-md">
              <Tag className="h-4 w-4 text-secondary" strokeWidth={2} />
              {t("listings", { count: parcels.length })}
            </span>
            <span className="inline-flex items-center gap-2 text-sm text-white/70">
              <ShieldCheck className="h-4 w-4 text-emerald-400" strokeWidth={2} />
              {t("verifiedOnly")}
            </span>
          </div>
        )}
      </PageHero>

      {parcels === null ? (
        <div className="flex justify-center bg-background py-24">
          <Spinner className="h-10 w-10" />
        </div>
      ) : (
        <section className="grid min-h-[32rem] bg-primary lg:min-h-[calc(100vh-5rem)] lg:grid-cols-[minmax(0,42%)_minmax(0,58%)]">
          {/* Listings panel — always visible */}
          <div className="relative z-10 order-2 border-t border-white/10 px-4 py-8 lg:order-1 lg:border-t-0 lg:px-6 lg:py-10">
            {parcels.length === 0 ? (
              <Reveal>
                <div className="rounded-2xl border border-dashed border-white/20 bg-white/5 p-10 text-center">
                  <MapPin className="mx-auto h-12 w-12 text-white/30" strokeWidth={1.5} />
                  <p className="mt-4 text-white/70">{t("empty")}</p>
                  <Link
                    href="/signup"
                    className="mt-6 inline-flex items-center gap-2 rounded-full bg-secondary px-6 py-3 text-sm font-semibold text-white"
                  >
                    {t("listCta")}
                    <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
                  </Link>
                </div>
              </Reveal>
            ) : (
              <>
                <div className="mb-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setRegionFilter("all")}
                    className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                      regionFilter === "all"
                        ? "bg-secondary text-white"
                        : "border border-white/20 bg-white/10 text-white/80 hover:bg-white/15"
                    }`}
                  >
                    {t("allRegions")}
                  </button>
                  {regions.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRegionFilter(r)}
                      className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                        regionFilter === r
                          ? "bg-secondary text-white"
                          : "border border-white/20 bg-white/10 text-white/80 hover:bg-white/15"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>

                <div className="nice-scroll max-h-[28rem] space-y-3 overflow-y-auto pr-1 lg:max-h-[calc(100vh-16rem)]">
                  {filtered.map((p, i) => {
                    const active = p.id === selected?.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedId(p.id)}
                        className={`group w-full rounded-2xl border p-4 text-left transition-all cursor-pointer ${
                          active
                            ? "border-secondary bg-white shadow-xl shadow-secondary/20"
                            : "border-white/10 bg-white/90 hover:border-secondary/40 hover:shadow-lg"
                        }`}
                      >
                        <div className="flex gap-4">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={SAMPLE_IMAGES[i % SAMPLE_IMAGES.length]}
                            alt=""
                            className="hidden h-20 w-20 shrink-0 rounded-xl object-cover sm:block"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <span className="truncate font-mono text-sm font-bold text-primary">
                                {p.parcel_reference}
                              </span>
                              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                                <CheckCircle2 className="h-3 w-3" strokeWidth={2.5} />
                                {t("verifiedBadge")}
                              </span>
                            </div>
                            <p className="mt-1 flex items-center gap-1 text-xs text-text/60">
                              <MapPin className="h-3 w-3" strokeWidth={2} />
                              {p.region}
                            </p>
                            <div className="mt-2 flex items-end justify-between gap-2">
                              <p className="text-lg font-extrabold text-secondary">
                                {p.listing?.price_xaf
                                  ? `${Number(p.listing.price_xaf).toLocaleString()} XAF`
                                  : "—"}
                              </p>
                              {p.area_sqm && (
                                <p className="flex items-center gap-1 text-xs text-text/50">
                                  <Ruler className="h-3 w-3" strokeWidth={2} />
                                  {p.area_sqm.toLocaleString()} m²
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {selected && (
                  <div className="mt-4 rounded-2xl border border-secondary/30 bg-secondary/10 p-5 backdrop-blur-md">
                    <p className="text-xs font-semibold uppercase tracking-wide text-white/60">
                      {t("selectedListing")}
                    </p>
                    <p className="mt-1 font-mono font-bold text-white">{selected.parcel_reference}</p>
                    <Link
                      href="/login"
                      className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-secondary py-3 text-sm font-semibold text-white shadow-lg shadow-secondary/30 transition-transform hover:scale-[1.01]"
                    >
                      {t("inquire")}
                      <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
                    </Link>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Map — always visible, fixed height on mobile, fills column on desktop */}
          <div className="relative order-1 min-h-[50vh] lg:order-2 lg:min-h-full">
            <MarketplaceMap
              parcels={filtered}
              selectedId={selected?.id}
              onSelect={(p) => setSelectedId(p.id)}
              className="absolute inset-0 h-full w-full min-h-[50vh]"
            />
          </div>
        </section>
      )}
    </>
  );
}
