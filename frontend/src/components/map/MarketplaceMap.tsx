"use client";

import { useEffect, useRef } from "react";
import maplibregl, { Map as MLMap, Marker } from "maplibre-gl";
import type { Parcel } from "@/lib/types";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

function mapStyle(): maplibregl.StyleSpecification | string {
  if (MAPBOX_TOKEN) {
    return `https://api.mapbox.com/styles/v1/mapbox/dark-v11?access_token=${MAPBOX_TOKEN}`;
  }
  return "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";
}

const DEFAULT_CENTER: [number, number] = [9.7679, 4.0511];

function parcelLngLat(parcel: Parcel): [number, number] | null {
  const geo = parcel.geojson;
  if (!geo) return null;
  if (geo.type === "Point") {
    const [lng, lat] = geo.coordinates as number[];
    return [lng, lat];
  }
  const ring = (geo.coordinates as number[][][])[0];
  if (!ring?.length) return null;
  const lng = ring.reduce((s, c) => s + c[0], 0) / ring.length;
  const lat = ring.reduce((s, c) => s + c[1], 0) / ring.length;
  return [lng, lat];
}

function formatPrice(xaf: number | null | undefined) {
  if (!xaf) return "—";
  if (xaf >= 1_000_000) return `${(xaf / 1_000_000).toFixed(1)}M`;
  return `${(xaf / 1000).toFixed(0)}K`;
}

interface MarketplaceMapProps {
  parcels: Parcel[];
  selectedId?: string | null;
  onSelect?: (parcel: Parcel) => void;
  className?: string;
}

/** Immersive dark map with custom price-tag markers for the marketplace. */
export default function MarketplaceMap({
  parcels,
  selectedId,
  onSelect,
  className = "h-full w-full",
}: MarketplaceMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const markersRef = useRef<{ marker: Marker; parcel: Parcel; el: HTMLButtonElement }[]>([]);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: mapStyle(),
      center: DEFAULT_CENTER,
      zoom: 11,
      attributionControl: false,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
    map.addControl(
      new maplibregl.AttributionControl({ compact: true }),
      "bottom-left",
    );
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Markers + fit bounds
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach(({ marker }) => marker.remove());
    markersRef.current = [];

    const bounds = new maplibregl.LngLatBounds();
    let hasBounds = false;

    for (const parcel of parcels) {
      const coords = parcelLngLat(parcel);
      if (!coords) continue;

      const el = document.createElement("button");
      el.type = "button";
      el.className =
        "group flex flex-col items-center border-0 bg-transparent p-0 cursor-pointer transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary";
      const price = formatPrice(parcel.listing?.price_xaf);
      el.innerHTML = `
        <span style="display:block;border-radius:9999px;background:#b45309;color:#fff;padding:4px 10px;font-size:11px;font-weight:700;white-space:nowrap;box-shadow:0 4px 14px rgba(180,83,9,0.45)">
          ${price} XAF
        </span>
        <span style="display:block;margin:2px auto 0;width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:8px solid #b45309"></span>
        <span style="display:block;margin:4px auto 0;width:10px;height:10px;border-radius:50%;background:#b45309;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></span>
      `;
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        onSelectRef.current?.(parcel);
        map.flyTo({ center: coords, zoom: 14, duration: 1200 });
      });

      const marker = new maplibregl.Marker({ element: el, anchor: "bottom" })
        .setLngLat(coords)
        .addTo(map);

      markersRef.current.push({ marker, parcel, el });
      bounds.extend(coords);
      hasBounds = true;
    }

    if (hasBounds && parcels.length > 0) {
      map.fitBounds(bounds, { padding: 80, maxZoom: 13, duration: 1000 });
    }
  }, [parcels]);

  // Highlight selected marker
  useEffect(() => {
    for (const { parcel, el } of markersRef.current) {
      const selected = parcel.id === selectedId;
      const tag = el.querySelector("span");
      if (tag) {
        tag.style.background = selected ? "#ffffff" : "#b45309";
        tag.style.color = selected ? "#111827" : "#ffffff";
        tag.style.boxShadow = selected
          ? "0 4px 20px rgba(255,255,255,0.4)"
          : "0 4px 14px rgba(180,83,9,0.45)";
      }
      el.style.transform = selected ? "scale(1.15)" : "";
      el.style.zIndex = selected ? "10" : "1";
    }
  }, [selectedId]);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <div ref={containerRef} className="absolute inset-0" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-primary/40 via-transparent to-primary/20" />
    </div>
  );
}
