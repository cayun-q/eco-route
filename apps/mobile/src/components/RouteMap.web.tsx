import { useEffect, useId, useRef, useState } from "react";
import type { Place, RouteLeg, TransportMode } from "@carbonroute/shared";
import { colors } from "../theme";

type Props = {
  origin: Place;
  destination: Place;
  polyline: [number, number][];
  mode: TransportMode;
  legs?: RouteLeg[];
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

type MapLike = {
  fitBounds: (b: unknown, o: object) => void;
  invalidateSize: () => void;
  removeLayer: (layer: unknown) => void;
  remove: () => void;
};

type PolylineLike = {
  addTo: (m: unknown) => PolylineLike;
  getBounds: () => unknown;
};

type MarkerLike = {
  addTo: (m: unknown) => MarkerLike;
  setLatLng: (ll: [number, number]) => MarkerLike;
};

type LeafletLike = {
  map: (el: HTMLElement, opts: object) => MapLike;
  tileLayer: (u: string, o: object) => { addTo: (m: unknown) => void };
  polyline: (pts: [number, number][], o: object) => PolylineLike;
  divIcon: (o: object) => unknown;
  marker: (ll: [number, number], o: object) => MarkerLike;
};

let leafletPromise: Promise<LeafletLike> | null = null;

function loadLeaflet(): Promise<LeafletLike> {
  const existing = (globalThis as { L?: LeafletLike }).L;
  if (existing) return Promise.resolve(existing);
  if (leafletPromise) return leafletPromise;

  leafletPromise = new Promise((resolve, reject) => {
    loadCss(LEAFLET_CSS);
    const finish = () => {
      const L = (globalThis as { L?: LeafletLike }).L;
      if (L) resolve(L);
      else reject(new Error("Leaflet loaded without global L"));
    };
    const existingScript = document.querySelector(`script[src="${LEAFLET_JS}"]`) as HTMLScriptElement | null;
    if (existingScript) {
      existingScript.addEventListener("load", finish, { once: true });
      existingScript.addEventListener("error", () => reject(new Error("Leaflet failed")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = LEAFLET_JS;
    script.async = true;
    script.onload = finish;
    script.onerror = () => reject(new Error("Leaflet failed"));
    document.head.appendChild(script);
  });
  return leafletPromise;
}

export function RouteMap({ origin, destination, polyline, mode, legs }: Props) {
  const rawId = useId().replace(/[^a-zA-Z0-9]/g, "");
  const id = `cr-map-${rawId}`;
  const mapRef = useRef<MapLike | null>(null);
  const leafletRef = useRef<LeafletLike | null>(null);
  const lineRefs = useRef<PolylineLike[]>([]);
  const originMarkerRef = useRef<MarkerLike | null>(null);
  const destinationMarkerRef = useRef<MarkerLike | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = await loadLeaflet();
      if (cancelled) return;
      const el = document.getElementById(id);
      if (!el) return;
      const map = L.map(el, {
        zoomControl: true,
        attributionControl: true,
        preferCanvas: true,
        wheelDebounceTime: 50,
      });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap",
        maxZoom: 18,
        updateWhenIdle: true,
        updateWhenZooming: false,
        keepBuffer: 3,
      }).addTo(map);
      leafletRef.current = L;
      mapRef.current = map;
      setReady(true);
      requestAnimationFrame(() => map.invalidateSize());
    })().catch(() => undefined);

    return () => {
      cancelled = true;
      setReady(false);
      lineRefs.current = [];
      originMarkerRef.current = null;
      destinationMarkerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
      leafletRef.current = null;
    };
  }, [id]);

  useEffect(() => {
    if (!ready || !polyline.length) return;
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map) return;

    for (const line of lineRefs.current) map.removeLayer(line);
    lineRefs.current = [];

    const drawLegs = legs?.length
      ? legs
      : [{ mode, polyline, origin, destination, distanceKm: 0, durationMin: 0, provider: "haversine" as const }];

    for (const leg of drawLegs) {
      if (!leg.polyline.length) continue;
      const line = L.polyline(leg.polyline, {
        color: leg.mode === "car" ? CAR_ROUTE : PLANE_ROUTE,
        weight: leg.mode === "car" ? 5 : 4,
        opacity: 0.94,
        smoothFactor: leg.mode === "plane" ? 0.3 : 1,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(map);
      lineRefs.current.push(line);
    }

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

    if (!originMarkerRef.current) {
      originMarkerRef.current = L.marker([origin.lat, origin.lng], { icon: iconA, title: origin.label }).addTo(map);
    } else {
      originMarkerRef.current.setLatLng([origin.lat, origin.lng]);
    }
    if (!destinationMarkerRef.current) {
      destinationMarkerRef.current = L.marker([destination.lat, destination.lng], { icon: iconB, title: destination.label }).addTo(map);
    } else {
      destinationMarkerRef.current.setLatLng([destination.lat, destination.lng]);
    }

    const boundsLine = L.polyline(polyline, { opacity: 0, weight: 0 }).addTo(map);
    map.fitBounds(boundsLine.getBounds(), { padding: [28, 28] });
    map.removeLayer(boundsLine);
    requestAnimationFrame(() => map.invalidateSize());
  }, [ready, origin.lat, origin.lng, origin.label, destination.lat, destination.lng, destination.label, polyline, mode, legs]);

  return <div id={id} style={{ width: "100%", height: "100%", background: colors.white }} />;
}
