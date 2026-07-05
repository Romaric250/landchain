"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { api } from "@/lib/api-client";
import type { Parcel } from "@/lib/types";
import { MarketplacePreviewSkeleton } from "@/components/ui";

const LAND_IMAGES = [
  "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=70",
  "https://images.unsplash.com/photo-1501854140801-50d01698950b?auto=format&fit=crop&w=800&q=70",
  "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=800&q=70",
];

const SAMPLES = [
  { ref: "LT-2024-DLA-00871", region: "Littoral — Douala V", price: 18_500_000, area: 500 },
  { ref: "LT-2023-CE-01204", region: "Centre — Yaoundé III", price: 32_000_000, area: 800 },
  { ref: "LT-2024-SW-00318", region: "South-West — Buea", price: 12_750_000, area: 650 },
];

interface CardData {
  key: string;
  ref: string;
  region: string;
  price: number | null;
  area: number | null;
  sample: boolean;
}

function toCards(items: typeof SAMPLES): CardData[] {
  return items.map((s) => ({
    key: s.ref,
    ref: s.ref,
    region: s.region,
    price: s.price,
    area: s.area,
    sample: true,
  }));
}

export function MarketplacePreview() {
  const t = useTranslations("home.marketplacePreview");
  const [cards, setCards] = useState<CardData[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    api<{ items: Parcel[] }>("/parcels?for_sale=true&limit=3", { auth: false })
      .then((data) => {
        if (cancelled) return;
        if (data.items.length > 0) {
          const real = data.items.map((p) => ({
            key: p.id,
            ref: p.parcel_reference,
            region: p.region,
            price: p.listing?.price_xaf ?? null,
            area: p.area_sqm ?? null,
            sample: false,
          }));
          setCards(
            [
              ...real,
              ...toCards(SAMPLES.slice(real.length)),
            ].slice(0, 3),
          );
        } else {
          setCards(toCards(SAMPLES));
        }
      })
      .catch(() => {
        if (!cancelled) setCards(toCards(SAMPLES));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (cards === null) {
    return <MarketplacePreviewSkeleton />;
  }

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {cards.map((card, i) => (
        <Link
          key={card.key}
          href="/marketplace"
          className="group overflow-hidden rounded-2xl border border-text/10 bg-background shadow-sm transition-all hover:-translate-y-1.5 hover:shadow-xl"
        >
          <div className="relative h-48 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={LAND_IMAGES[i % LAND_IMAGES.length]}
              alt={card.region}
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-primary shadow">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
              {t("verifiedBadge")}
            </span>
            {card.sample && (
              <span className="absolute right-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white backdrop-blur">
                {t("sampleBadge")}
              </span>
            )}
            <span className="absolute bottom-3 left-3 font-mono text-sm font-semibold text-white">
              {card.ref}
            </span>
          </div>
          <div className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm font-medium text-text/70">{card.region}</p>
              <p className="mt-1 text-lg font-extrabold text-primary">
                {card.price ? `${card.price.toLocaleString()} XAF` : "—"}
              </p>
            </div>
            <div className="text-right text-sm text-text/60">
              {card.area ? `${card.area.toLocaleString()} m²` : ""}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
