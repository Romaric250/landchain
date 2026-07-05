"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  ArrowRight,
  CheckCircle2,
  Mail,
  MapPin,
  Ruler,
  Search,
  ShieldCheck,
  Tag,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { useAuth } from "@/lib/auth";
import type { Parcel } from "@/lib/types";
import { PageHero } from "@/components/marketing/PageHero";
import { Reveal } from "@/components/ui/Reveal";
import {
  Button,
  MapSkeleton,
  MarketplacePageSkeleton,
  Modal,
  Select,
  Skeleton,
} from "@/components/ui";
import { DropdownItem, DropdownMenu } from "@/components/ui/DropdownMenu";

const MarketplaceMap = dynamic(() => import("@/components/map/MarketplaceMap"), {
  ssr: false,
  loading: () => <MapSkeleton className="h-full min-h-[16rem] w-full lg:min-h-[28rem]" />,
});

const SAMPLE_IMAGES = [
  "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=400&q=70",
  "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=400&q=70",
  "https://images.unsplash.com/photo-1501854140801-50d01698950b?auto=format&fit=crop&w=400&q=70",
];

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-[11px] font-semibold transition-colors cursor-pointer ${
        active
          ? "bg-secondary text-white shadow-sm shadow-secondary/25"
          : "border border-primary/15 bg-surface text-text/70 hover:border-secondary/30 hover:text-primary"
      }`}
    >
      {children}
    </button>
  );
}

export default function MarketplacePage() {
  const t = useTranslations("marketplace");
  const { user, loading: authLoading } = useAuth();
  const [parcels, setParcels] = useState<Parcel[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [regionFilter, setRegionFilter] = useState("all");
  const [contactOpen, setContactOpen] = useState(false);

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
        {parcels === null ? (
          <div className="flex flex-wrap items-center gap-3">
            <Skeleton className="h-9 w-40 rounded-full bg-white/10" />
            <Skeleton className="h-5 w-52 bg-white/10" />
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white backdrop-blur-md sm:text-sm">
              <Tag className="h-3.5 w-3.5 text-secondary" strokeWidth={2} />
              {t("listings", { count: parcels.length })}
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs text-white/70 sm:text-sm">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" strokeWidth={2} />
              {t("verifiedOnly")}
            </span>
          </div>
        )}
      </PageHero>

      {parcels === null ? (
        <MarketplacePageSkeleton />
      ) : (
        <section className="bg-background">
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
            <div className="overflow-hidden rounded-2xl border border-primary/10 bg-surface shadow-lg shadow-primary/5 lg:rounded-3xl">
              <div className="grid lg:grid-cols-[minmax(0,22rem)_1fr] xl:grid-cols-[minmax(0,26rem)_1fr]">
                {/* Map — top on mobile, right on desktop */}
                <div className="relative order-1 min-h-[14rem] sm:min-h-[18rem] lg:order-2 lg:min-h-[28rem]">
                  <MarketplaceMap
                    parcels={filtered}
                    selectedId={selected?.id}
                    onSelect={(p) => setSelectedId(p.id)}
                    className="absolute inset-0 h-full w-full"
                  />
                </div>

                {/* Listings sidebar */}
                <div className="order-2 border-t border-primary/10 bg-background/60 p-4 sm:p-5 lg:order-1 lg:border-t-0 lg:border-r">
                  {parcels.length === 0 ? (
                    <Reveal>
                      <div className="rounded-xl border border-dashed border-primary/15 bg-surface p-8 text-center">
                        <MapPin className="mx-auto h-10 w-10 text-text/25" strokeWidth={1.5} />
                        <p className="mt-3 text-sm text-text/60">{t("empty")}</p>
                        <Link
                          href="/signup"
                          className="mt-5 inline-flex items-center gap-2 rounded-full bg-secondary px-5 py-2.5 text-sm font-semibold text-white"
                        >
                          {t("listCta")}
                          <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.5} />
                        </Link>
                      </div>
                    </Reveal>
                  ) : (
                    <>
                      <div className="mb-3 hidden flex-wrap gap-1.5 sm:flex">
                        <FilterPill
                          active={regionFilter === "all"}
                          onClick={() => setRegionFilter("all")}
                        >
                          {t("allRegions")}
                        </FilterPill>
                        {regions.map((r) => (
                          <FilterPill
                            key={r}
                            active={regionFilter === r}
                            onClick={() => setRegionFilter(r)}
                          >
                            {r}
                          </FilterPill>
                        ))}
                      </div>
                      <div className="mb-3 sm:hidden">
                        <Select
                          label={t("filterRegion")}
                          value={regionFilter}
                          onChange={(e) => setRegionFilter(e.target.value)}
                        >
                          <option value="all">{t("allRegions")}</option>
                          {regions.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </Select>
                      </div>

                      <div className="nice-scroll max-h-[20rem] space-y-2 overflow-y-auto pr-0.5 lg:max-h-[calc(28rem-8rem)]">
                        {filtered.map((p, i) => {
                          const active = p.id === selected?.id;
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => setSelectedId(p.id)}
                              className={`group w-full rounded-xl border p-3 text-left transition-all cursor-pointer ${
                                active
                                  ? "border-secondary bg-surface shadow-md ring-1 ring-secondary/20"
                                  : "border-primary/10 bg-surface hover:border-secondary/30 hover:shadow-sm"
                              }`}
                            >
                              <div className="flex gap-3">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={SAMPLE_IMAGES[i % SAMPLE_IMAGES.length]}
                                  alt=""
                                  className="hidden h-14 w-14 shrink-0 rounded-lg object-cover sm:block"
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-start justify-between gap-2">
                                    <span className="truncate font-mono text-xs font-bold text-primary sm:text-sm">
                                      {p.parcel_reference}
                                    </span>
                                    <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-700">
                                      <CheckCircle2 className="h-2.5 w-2.5" strokeWidth={2.5} />
                                      {t("verifiedBadge")}
                                    </span>
                                  </div>
                                  <p className="mt-0.5 flex items-center gap-1 text-[11px] text-text/55">
                                    <MapPin className="h-2.5 w-2.5 shrink-0" strokeWidth={2} />
                                    <span className="truncate">{p.region}</span>
                                  </p>
                                  <div className="mt-1.5 flex items-end justify-between gap-2">
                                    <p className="text-sm font-extrabold text-secondary">
                                      {p.listing?.price_xaf
                                        ? `${Number(p.listing.price_xaf).toLocaleString()} XAF`
                                        : "—"}
                                    </p>
                                    {p.area_sqm && (
                                      <p className="flex items-center gap-0.5 text-[10px] text-text/45">
                                        <Ruler className="h-2.5 w-2.5" strokeWidth={2} />
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
                        <div className="mt-3 rounded-xl border border-secondary/25 bg-accent/40 p-4">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-text/50">
                            {t("selectedListing")}
                          </p>
                          <p className="mt-0.5 font-mono text-sm font-bold text-primary">
                            {selected.parcel_reference}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text/60">
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-secondary" strokeWidth={2} />
                              {selected.region}
                            </span>
                            {selected.area_sqm && (
                              <span className="flex items-center gap-1">
                                <Ruler className="h-3 w-3 text-secondary" strokeWidth={2} />
                                {selected.area_sqm.toLocaleString()} m²
                              </span>
                            )}
                            {selected.listing?.price_xaf && (
                              <span className="font-semibold text-secondary">
                                {Number(selected.listing.price_xaf).toLocaleString()} XAF
                              </span>
                            )}
                          </div>
                          {authLoading ? (
                            <Skeleton className="mt-3 h-10 w-full rounded-lg" />
                          ) : user ? (
                            <DropdownMenu
                              className="mt-3 w-full"
                              trigger={
                                <span className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-secondary py-2.5 text-xs font-semibold text-white shadow-sm shadow-secondary/20 sm:text-sm">
                                  {t("contactSeller")}
                                  <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.5} />
                                </span>
                              }
                            >
                              <DropdownItem onClick={() => setContactOpen(true)}>
                                <Mail className="h-4 w-4" strokeWidth={2} />
                                {t("requestContact")}
                              </DropdownItem>
                              <Link
                                href={`/verify?ref=${encodeURIComponent(selected.parcel_reference)}`}
                                className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-sm text-text/80 transition-colors hover:bg-accent/40 hover:text-primary"
                                role="menuitem"
                              >
                                <Search className="h-4 w-4" strokeWidth={2} />
                                {t("verifyListing")}
                              </Link>
                            </DropdownMenu>
                          ) : (
                            <Link
                              href="/login"
                              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-secondary py-2.5 text-xs font-semibold text-white shadow-sm shadow-secondary/20 transition-transform hover:scale-[1.01] sm:text-sm"
                            >
                              {t("inquire")}
                              <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.5} />
                            </Link>
                          )}
                        </div>
                      )}

                      <Modal open={contactOpen} onClose={() => setContactOpen(false)} title={t("contactTitle")}>
                        <p className="text-sm text-text/70">{t("contactBody")}</p>
                        {selected && (
                          <p className="mt-3 rounded-lg bg-accent/40 px-3 py-2 font-mono text-sm font-semibold text-primary">
                            {selected.parcel_reference}
                          </p>
                        )}
                        <div className="mt-5 flex flex-col gap-2">
                          <Button variant="secondary" onClick={() => setContactOpen(false)}>
                            {t("contactClose")}
                          </Button>
                          <a
                            href={`mailto:support@landchain.cm?subject=${encodeURIComponent(
                              `Marketplace inquiry — ${selected?.parcel_reference ?? ""}`,
                            )}`}
                            className="inline-flex items-center justify-center gap-2 rounded-lg border border-primary/15 px-4 py-2 text-sm font-medium text-primary hover:bg-accent/40"
                          >
                            <Mail className="h-4 w-4" strokeWidth={2} />
                            {t("contactEmail")}
                          </a>
                        </div>
                      </Modal>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
