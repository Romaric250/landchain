"use client";

import { useEffect, useRef } from "react";
import maplibregl, { Map as MLMap, Marker } from "maplibre-gl";
import type { Parcel } from "@/lib/types";

/* Map provider abstraction (§17): Mapbox tiles when a token is configured,
   OpenStreetMap raster tiles otherwise — swap via env config, not a rewrite. */
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

function mapStyle(): maplibregl.StyleSpecification | string {
  if (MAPBOX_TOKEN) {
    return `https://api.mapbox.com/styles/v1/mapbox/streets-v12?access_token=${MAPBOX_TOKEN}`;
  }
  return {
    version: 8,
    sources: {
      osm: {
        type: "raster",
        tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
        tileSize: 256,
        attribution: "© OpenStreetMap contributors",
      },
    },
    layers: [{ id: "osm", type: "raster", source: "osm" }],
  };
}

// Douala, Cameroon
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

function markerColor(parcel: Parcel): string {
  if (parcel.status === "disputed" || parcel.status === "flagged") return "#dc2626";
  if (parcel.listing?.is_for_sale && parcel.listing?.status === "active") return "#b45309";
  return "#111827";
}

interface ParcelMapProps {
  parcels?: Parcel[];
  onPick?: (lng: number, lat: number) => void;
  picked?: [number, number] | null;
  onParcelClick?: (parcel: Parcel) => void;
  className?: string;
  center?: [number, number];
  zoom?: number;
}

export default function ParcelMap({
  parcels = [],
  onPick,
  picked,
  onParcelClick,
  className = "h-96 w-full rounded-xl",
  center = DEFAULT_CENTER,
  zoom = 11,
}: ParcelMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const pickMarkerRef = useRef<Marker | null>(null);
  const onPickRef = useRef(onPick);
  const onParcelClickRef = useRef(onParcelClick);
  onPickRef.current = onPick;
  onParcelClickRef.current = onParcelClick;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: mapStyle(),
      center,
      zoom,
    });
    map.addControl(new maplibregl.NavigationControl(), "top-right");
    map.on("click", (e) => {
      onPickRef.current?.(e.lngLat.lng, e.lngLat.lat);
    });
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Parcel markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    for (const parcel of parcels) {
      const coords = parcelLngLat(parcel);
      if (!coords) continue;
      const marker = new maplibregl.Marker({ color: markerColor(parcel) })
        .setLngLat(coords)
        .addTo(map);
      marker.getElement().style.cursor = "pointer";
      marker.getElement().addEventListener("click", (e) => {
        e.stopPropagation();
        onParcelClickRef.current?.(parcel);
      });
      const popupLines = [
        `<strong>${parcel.parcel_reference}</strong>`,
        parcel.region ?? "",
        parcel.listing?.is_for_sale && parcel.listing.price_xaf
          ? `${Number(parcel.listing.price_xaf).toLocaleString()} XAF`
          : "",
      ].filter(Boolean);
      marker.setPopup(new maplibregl.Popup({ offset: 24 }).setHTML(popupLines.join("<br/>")));
      markersRef.current.push(marker);
    }
  }, [parcels]);

  // Picked-location marker (registration flow)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    pickMarkerRef.current?.remove();
    pickMarkerRef.current = null;
    if (picked) {
      pickMarkerRef.current = new maplibregl.Marker({ color: "#b45309", draggable: false })
        .setLngLat(picked)
        .addTo(map);
    }
  }, [picked]);

  return <div ref={containerRef} className={className} />;
}
