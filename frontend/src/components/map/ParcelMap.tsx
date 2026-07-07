"use client";

import { useEffect, useRef } from "react";
import maplibregl, { Map as MLMap, Marker } from "maplibre-gl";
import type { GeoJSONGeometry, Parcel } from "@/lib/types";

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

const DEFAULT_CENTER: [number, number] = [9.7679, 4.0511];
const PARCEL_SOURCE = "landchain-parcels";
const PARCEL_FILL = "landchain-parcels-fill";
const PARCEL_LINE = "landchain-parcels-line";

export function parcelLngLat(parcel: Parcel): [number, number] | null {
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

export function markerColor(parcel: Parcel): string {
  if (parcel.status === "disputed" || parcel.status === "flagged") return "#dc2626";
  if (parcel.listing?.is_for_sale && parcel.listing?.status === "active") return "#b45309";
  return "#111827";
}

function parcelFillColor(parcel: Parcel): string {
  if (parcel.status === "disputed" || parcel.status === "flagged") return "#dc2626";
  if (parcel.listing?.is_for_sale && parcel.listing?.status === "active") return "#b45309";
  return "#1e3a5f";
}

function parcelsToFeatureCollection(parcels: Parcel[]): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];
  for (const parcel of parcels) {
    const geo = parcel.geojson;
    if (!geo || geo.type !== "Polygon") continue;
    features.push({
      type: "Feature",
      properties: {
        id: parcel.id,
        color: parcelFillColor(parcel),
        fillOpacity: parcel.status === "disputed" ? 0.35 : 0.22,
      },
      geometry: geo as GeoJSON.Polygon,
    });
  }
  return { type: "FeatureCollection", features };
}

interface ParcelMapProps {
  parcels?: Parcel[];
  onPick?: (lng: number, lat: number) => void;
  picked?: [number, number] | null;
  drawnPolygon?: GeoJSONGeometry | null;
  onParcelClick?: (parcel: Parcel) => void;
  className?: string;
  center?: [number, number];
  zoom?: number;
  interactive?: boolean;
  showPolygons?: boolean;
}

export default function ParcelMap({
  parcels = [],
  onPick,
  picked,
  drawnPolygon,
  onParcelClick,
  className = "h-96 w-full rounded-xl",
  center = DEFAULT_CENTER,
  zoom = 11,
  interactive = true,
  showPolygons = true,
}: ParcelMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const pickMarkerRef = useRef<Marker | null>(null);
  const onPickRef = useRef(onPick);
  const onParcelClickRef = useRef(onParcelClick);
  const parcelsRef = useRef(parcels);
  onPickRef.current = onPick;
  onParcelClickRef.current = onParcelClick;
  parcelsRef.current = parcels;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: mapStyle(),
      center,
      zoom,
      interactive,
    });
    map.addControl(new maplibregl.NavigationControl(), "top-right");
    if (onPickRef.current) {
      map.on("click", (e) => {
        onPickRef.current?.(e.lngLat.lng, e.lngLat.lat);
      });
    }
    map.on("load", () => {
      if (showPolygons) {
        map.addSource(PARCEL_SOURCE, {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });
        map.addLayer({
          id: PARCEL_FILL,
          type: "fill",
          source: PARCEL_SOURCE,
          paint: {
            "fill-color": ["get", "color"],
            "fill-opacity": ["get", "fillOpacity"],
          },
        });
        map.addLayer({
          id: PARCEL_LINE,
          type: "line",
          source: PARCEL_SOURCE,
          paint: {
            "line-color": ["get", "color"],
            "line-width": 2,
          },
        });
        map.on("click", PARCEL_FILL, (e) => {
          const id = e.features?.[0]?.properties?.id as string | undefined;
          if (!id) return;
          const parcel = parcelsRef.current.find((p) => p.id === id);
          if (parcel) onParcelClickRef.current?.(parcel);
        });
        map.on("mouseenter", PARCEL_FILL, () => {
          map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", PARCEL_FILL, () => {
          map.getCanvas().style.cursor = "";
        });
      }
    });
    mapRef.current = map;
    const ro = new ResizeObserver(() => map.resize());
    ro.observe(containerRef.current);
    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Parcel polygons
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !showPolygons) return;
    const apply = () => {
      const src = map.getSource(PARCEL_SOURCE) as maplibregl.GeoJSONSource | undefined;
      if (src) src.setData(parcelsToFeatureCollection(parcels));
    };
    if (map.isStyleLoaded()) apply();
    else map.once("load", apply);
  }, [parcels, showPolygons]);

  // Drawn polygon overlay (registration)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const sourceId = "landchain-drawn";
    const fillId = "landchain-drawn-fill";
    const lineId = "landchain-drawn-line";
    const apply = () => {
      if (!drawnPolygon || drawnPolygon.type !== "Polygon") {
        if (map.getLayer(fillId)) map.removeLayer(fillId);
        if (map.getLayer(lineId)) map.removeLayer(lineId);
        if (map.getSource(sourceId)) map.removeSource(sourceId);
        return;
      }
      const data: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features: [{
          type: "Feature",
          properties: {},
          geometry: drawnPolygon as GeoJSON.Polygon,
        }],
      };
      if (!map.getSource(sourceId)) {
        map.addSource(sourceId, { type: "geojson", data });
        map.addLayer({ id: fillId, type: "fill", source: sourceId, paint: { "fill-color": "#b45309", "fill-opacity": 0.25 } });
        map.addLayer({ id: lineId, type: "line", source: sourceId, paint: { "line-color": "#b45309", "line-width": 3 } });
      } else {
        (map.getSource(sourceId) as maplibregl.GeoJSONSource).setData(data);
      }
    };
    if (map.isStyleLoaded()) apply();
    else map.once("load", apply);
  }, [drawnPolygon]);

  // Point markers (centroid for polygons without fill click, or Point geometry)
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

  // Picked-location marker
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
