import { useEffect, useId, useRef } from "react";
import type { Place, TransportMode } from "@carbonroute/shared";
import { colors } from "../theme";

type Props = {
  origin: Place;
  destination: Place;
  polyline: [number, number][];
  mode?: TransportMode;
  strokeColor?: string;
  connectors?: [number, number][][];
};

const LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
const LEAFLET_JS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";

function loadCss(href: string) {
  if (document.querySelector(`link[href="${href}"]`)) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  document.head.appendChild(link);
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("leaflet failed"));
    document.head.appendChild(script);
  });
}

type LeafletLike = {
  map: (el: HTMLElement, opts: object) => {
    fitBounds: (b: unknown, o: object) => void;
    invalidateSize: () => void;
    remove: () => void;
  };
  tileLayer: (u: string, o: object) => { addTo: (m: unknown) => void };
  polyline: (pts: [number, number][], o: object) => { addTo: (m: unknown) => unknown; getBounds: () => unknown };
  featureGroup: (layers: unknown[]) => { getBounds: () => unknown };
  divIcon: (o: object) => unknown;
  marker: (ll: [number, number], o: object) => { addTo: (m: unknown) => void };
};

function strokeFor(mode?: TransportMode, strokeColor?: string): string {
  if (strokeColor) return strokeColor;
  if (mode === "car") return colors.mode.car;
  if (mode === "plane") return colors.mode.plane;
  if (mode === "train") return colors.mode.train;
  return colors.ink;
}

export function RouteMap({ origin, destination, polyline, mode, strokeColor, connectors = [] }: Props) {
  const rawId = useId().replace(/[^a-zA-Z0-9]/g, "");
  const id = `cr-map-${rawId}`;
  const mapRef = useRef<{ remove: () => void } | null>(null);

  useEffect(() => {
    if (!polyline.length) return;
    let cancelled = false;
    (async () => {
      loadCss(LEAFLET_CSS);
      await loadScript(LEAFLET_JS);
      if (cancelled) return;
      const L = (globalThis as { L?: LeafletLike }).L;
      const el = document.getElementById(id);
      if (!L || !el) return;
      mapRef.current?.remove();
      const map = L.map(el, { zoomControl: true, attributionControl: true });
      // Esri street tiles — no API key (Carto light_all watermarks without one).
      L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}", {
        attribution: "Tiles © Esri — Source: Esri, OpenStreetMap",
        maxZoom: 18,
      }).addTo(map);
      const color = strokeFor(mode, strokeColor);
      const layers: unknown[] = [];
      const line = L.polyline(polyline, {
        color,
        weight: 3.75,
        opacity: 0.95,
      }).addTo(map);
      layers.push(line);
      for (const connector of connectors) {
        if (connector.length < 2) continue;
        layers.push(
          L.polyline(connector, {
            color: colors.muted,
            weight: 2,
            opacity: 0.7,
            dashArray: "6 6",
          }).addTo(map),
        );
      }
      const iconA = L.divIcon({
        className: "",
        html: `<div style="width:14px;height:14px;background:${colors.accent};border:2px solid ${colors.white};box-shadow:2px 2px 0 ${colors.ink}29"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });
      const iconB = L.divIcon({
        className: "",
        html: `<div style="width:14px;height:14px;background:${colors.clay};border:2px solid ${colors.white};box-shadow:2px 2px 0 ${colors.ink}29"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });
      L.marker([origin.lat, origin.lng], { icon: iconA }).addTo(map);
      L.marker([destination.lat, destination.lng], { icon: iconB }).addTo(map);
      const bounds = L.featureGroup ? L.featureGroup(layers).getBounds() : (line as { getBounds: () => unknown }).getBounds();
      map.fitBounds(bounds, { padding: [28, 28] });
      map.invalidateSize();
      mapRef.current = map;
    })().catch(() => undefined);
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [id, origin, destination, polyline, mode, strokeColor, connectors]);

  if (!polyline.length) return null;
  return <div id={id} style={{ flex: 1, minHeight: 240, background: colors.white }} />;
}
