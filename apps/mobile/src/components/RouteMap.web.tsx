import { useEffect, useId, useRef } from "react";
import type { Place, TransportMode } from "@carbonroute/shared";
import { colors } from "../theme";

type Props = {
  origin: Place;
  destination: Place;
  polyline: [number, number][];
  mode: TransportMode;
};

const LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
const LEAFLET_JS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
const CAR_ROUTE = "#2563EB";
const PLANE_ROUTE = "#D97706";

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
  divIcon: (o: object) => unknown;
  marker: (ll: [number, number], o: object) => { addTo: (m: unknown) => void };
};

export function RouteMap({ origin, destination, polyline, mode }: Props) {
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
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap",
        maxZoom: 18,
      }).addTo(map);
      const line = L.polyline(polyline, {
        color: mode === "car" ? CAR_ROUTE : PLANE_ROUTE,
        weight: mode === "car" ? 5 : 4,
        opacity: 0.94,
        smoothFactor: mode === "plane" ? 0.35 : 1,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(map);
      const iconA = L.divIcon({
        className: "",
        html: `<div style="width:14px;height:14px;background:${colors.accent};border:2px solid ${colors.white};box-shadow:2px 2px 0 ${colors.ink}29;border-radius:50%"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });
      const iconB = L.divIcon({
        className: "",
        html: `<div style="width:14px;height:14px;background:${colors.clay};border:2px solid ${colors.white};box-shadow:2px 2px 0 ${colors.ink}29;border-radius:50%"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });
      L.marker([origin.lat, origin.lng], { icon: iconA, title: origin.label }).addTo(map);
      L.marker([destination.lat, destination.lng], { icon: iconB, title: destination.label }).addTo(map);
      map.fitBounds(line.getBounds(), { padding: [28, 28] });
      mapRef.current = map;
      setTimeout(() => map.invalidateSize(), 80);
    })().catch(() => undefined);
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [id, origin, destination, polyline, mode]);

  return <div id={id} style={{ width: "100%", height: "100%", background: colors.white }} />;
}
