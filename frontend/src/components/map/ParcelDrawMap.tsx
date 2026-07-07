"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl, { Map as MLMap } from "maplibre-gl";
import { useTranslations } from "next-intl";
import type { GeoJSONGeometry } from "@/lib/types";
import { Button } from "@/components/ui";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
const DEFAULT_CENTER: [number, number] = [9.7679, 4.0511];

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

interface ParcelDrawMapProps {
  value: GeoJSONGeometry | null;
  onChange: (geo: GeoJSONGeometry | null) => void;
  className?: string;
}

/** Click to add polygon vertices; finish when ≥3 points. */
export default function ParcelDrawMap({ value, onChange, className = "h-96 w-full rounded-xl" }: ParcelDrawMapProps) {
  const t = useTranslations("parcels.draw");
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const pointsRef = useRef<[number, number][]>([]);
  const [pointCount, setPointCount] = useState(0);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  function syncOverlay(map: MLMap, points: [number, number][], closed: boolean) {
    const sourceId = "draw-points";
    const lineId = "draw-line";
    const fillId = "draw-fill";
    const vertexSource = "draw-vertices";

    const lineCoords = closed && points.length >= 3
      ? [...points, points[0]]
      : points;

    const features: GeoJSON.Feature[] = points.map(([lng, lat], i) => ({
      type: "Feature",
      properties: { index: i + 1 },
      geometry: { type: "Point", coordinates: [lng, lat] },
    }));

    if (lineCoords.length >= 2) {
      features.push({
        type: "Feature",
        properties: {},
        geometry: { type: "LineString", coordinates: lineCoords },
      });
    }
    if (closed && points.length >= 3) {
      features.push({
        type: "Feature",
        properties: {},
        geometry: { type: "Polygon", coordinates: [[...points, points[0]]] },
      });
    }

    const collection: GeoJSON.FeatureCollection = { type: "FeatureCollection", features };
    const src = map.getSource(sourceId) as maplibregl.GeoJSONSource | undefined;
    if (src) src.setData(collection);
    else {
      map.addSource(sourceId, { type: "geojson", data: collection });
      map.addLayer({
        id: fillId,
        type: "fill",
        source: sourceId,
        filter: ["==", ["geometry-type"], "Polygon"],
        paint: { "fill-color": "#b45309", "fill-opacity": 0.2 },
      });
      map.addLayer({
        id: lineId,
        type: "line",
        source: sourceId,
        filter: ["==", ["geometry-type"], "LineString"],
        paint: { "line-color": "#b45309", "line-width": 2, "line-dasharray": [2, 1] },
      });
      map.addLayer({
        id: "draw-vertices-circles",
        type: "circle",
        source: sourceId,
        filter: ["==", ["geometry-type"], "Point"],
        paint: { "circle-radius": 6, "circle-color": "#b45309", "circle-stroke-width": 2, "circle-stroke-color": "#fff" },
      });
    }
    void vertexSource;
  }

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: mapStyle(),
      center: DEFAULT_CENTER,
      zoom: 12,
    });
    map.addControl(new maplibregl.NavigationControl(), "top-right");
    map.on("click", (e) => {
      if (value) return;
      pointsRef.current = [...pointsRef.current, [e.lngLat.lng, e.lngLat.lat]];
      setPointCount(pointsRef.current.length);
      syncOverlay(map, pointsRef.current, false);
    });
    map.on("load", () => {
      syncOverlay(map, [], false);
      if (value?.type === "Polygon") {
        const ring = (value.coordinates as number[][][])[0];
        const pts = ring.slice(0, -1).map((c) => [c[0], c[1]] as [number, number]);
        pointsRef.current = pts;
        setPointCount(pts.length);
        syncOverlay(map, pts, true);
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

  function undo() {
    if (value) return;
    pointsRef.current = pointsRef.current.slice(0, -1);
    setPointCount(pointsRef.current.length);
    const map = mapRef.current;
    if (map) syncOverlay(map, pointsRef.current, false);
  }

  function clear() {
    pointsRef.current = [];
    setPointCount(0);
    onChangeRef.current(null);
    const map = mapRef.current;
    if (map) syncOverlay(map, [], false);
  }

  function finish() {
    const pts = pointsRef.current;
    if (pts.length < 3) return;
    const ring = [...pts, pts[0]];
    const geo: GeoJSONGeometry = { type: "Polygon", coordinates: [ring] };
    onChangeRef.current(geo);
    const map = mapRef.current;
    if (map) syncOverlay(map, pts, true);
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-text/60">{value ? t("done") : t("hint")}</p>
      <div ref={containerRef} className={`border border-text/10 ${className}`} />
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={undo} disabled={!!value || pointCount === 0}>
          {t("undo")}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={clear} disabled={pointCount === 0 && !value}>
          {t("clear")}
        </Button>
        <Button type="button" size="sm" onClick={finish} disabled={!!value || pointCount < 3}>
          {t("finish")} ({pointCount}/3+)
        </Button>
        {value && (
          <Button type="button" variant="secondary" size="sm" onClick={clear}>
            {t("redraw")}
          </Button>
        )}
      </div>
    </div>
  );
}
