import { modeColor } from "../theme";
import { createElement, useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import type { RouteMapProps } from "./routeMapTypes";

const LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
const LEAFLET_JS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";

type LeafletMap = {
  remove: () => void;
  fitBounds: (bounds: unknown, opts?: { padding: [number, number] }) => void;
  invalidateSize?: () => void;
};

type LeafletNs = {
  map: (el: HTMLElement, opts?: Record<string, unknown>) => LeafletMap & {
    eachLayer?: (fn: (layer: { remove: () => void }) => void) => void;
  };
  tileLayer: (url: string, opts?: Record<string, unknown>) => { addTo: (map: unknown) => void };
  polyline: (
    latLngs: Array<[number, number]>,
    opts?: Record<string, unknown>,
  ) => { addTo: (map: unknown) => { getBounds: () => unknown } };
  circleMarker: (
    latLng: [number, number],
    opts?: Record<string, unknown>,
  ) => { addTo: (map: unknown) => { bindTooltip: (text: string, opts?: Record<string, unknown>) => void } };
};

declare global {
  // eslint-disable-next-line no-var
  var L: LeafletNs | undefined;
}

async function loadLeaflet(): Promise<LeafletNs> {
  if (globalThis.L) return globalThis.L;
  const doc = globalThis.document;
  if (!doc) throw new Error("Leaflet is only available on web");

  if (!doc.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
    await new Promise<void>((resolve, reject) => {
      const link = doc.createElement("link");
      link.rel = "stylesheet";
      link.href = LEAFLET_CSS;
      link.onload = () => resolve();
      link.onerror = () => reject(new Error("Could not load Leaflet CSS"));
      doc.head.appendChild(link);
    });
  }

  await new Promise<void>((resolve, reject) => {
    const script = doc.createElement("script");
    script.src = LEAFLET_JS;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load Leaflet"));
    doc.body.appendChild(script);
  });

  if (!globalThis.L) throw new Error("Leaflet failed to initialize");
  return globalThis.L;
}

function RouteSketch({
  origin,
  destination,
  polyline,
  mode,
  height,
}: Pick<RouteMapProps, "origin" | "destination" | "polyline" | "mode" | "height">) {
  const line = polyline.length >= 2 ? polyline : [origin, destination];
  const lats = line.map((point) => point.lat);
  const lngs = line.map((point) => point.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const padLat = Math.max(0.2, (maxLat - minLat) * 0.25 || 0.2);
  const padLng = Math.max(0.2, (maxLng - minLng) * 0.25 || 0.2);
  const west = minLng - padLng;
  const east = maxLng + padLng;
  const south = minLat - padLat;
  const north = maxLat + padLat;
  const width = 400;
  const h = height ?? 240;
  const project = (point: { lat: number; lng: number }) => {
    const x = ((point.lng - west) / (east - west)) * width;
    const y = ((north - point.lat) / (north - south)) * h;
    return `${x},${y}`;
  };
  const color = modeColor(mode);
  return createElement(
    "svg",
    {
      viewBox: `0 0 ${width} ${h}`,
      width: "100%",
      height: h,
      style: { display: "block", background: "#DCE8DF" },
    },
    createElement("polyline", {
      points: line.map(project).join(" "),
      fill: "none",
      stroke: color,
      strokeWidth: 5,
      strokeLinecap: "round",
      strokeLinejoin: "round",
    }),
    createElement("circle", { cx: project(origin).split(",")[0], cy: project(origin).split(",")[1], r: 7, fill: "#1B7A4E" }),
    createElement("circle", {
      cx: project(destination).split(",")[0],
      cy: project(destination).split(",")[1],
      r: 7,
      fill: "#C2410C",
    }),
  );
}

export function RouteMap({
  origin,
  destination,
  originLabel,
  destinationLabel,
  polyline,
  mode,
  height = 240,
}: RouteMapProps) {
  const host = useRef<View>(null);
  const [tilesReady, setTilesReady] = useState(false);
  const line = polyline.length >= 2 ? polyline : [origin, destination];

  useEffect(() => {
    let cancelled = false;
    let map: LeafletMap | undefined;
    setTilesReady(false);

    const el = host.current as unknown as HTMLElement | null;
    if (!el) return undefined;

    void loadLeaflet()
      .then((L) => {
        if (cancelled) return;
        el.innerHTML = "";
        const instance = L.map(el, {
          zoomControl: true,
          scrollWheelZoom: false,
          attributionControl: true,
        });
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: "&copy; OpenStreetMap",
        }).addTo(instance);

        const latLngs = line.map((point) => [point.lat, point.lng] as [number, number]);
        const layer = L.polyline(latLngs, {
          color: modeColor(mode),
          weight: 5,
          opacity: 0.92,
        }).addTo(instance);

        L.circleMarker([origin.lat, origin.lng], {
          radius: 8,
          color: "#0F3D2E",
          fillColor: "#1B7A4E",
          fillOpacity: 1,
          weight: 2,
        })
          .addTo(instance)
          .bindTooltip(originLabel || "Start", { permanent: false });

        L.circleMarker([destination.lat, destination.lng], {
          radius: 8,
          color: "#7F1D1D",
          fillColor: "#C2410C",
          fillOpacity: 1,
          weight: 2,
        })
          .addTo(instance)
          .bindTooltip(destinationLabel || "End", { permanent: false });

        instance.fitBounds(layer.getBounds(), { padding: [28, 28] });
        instance.invalidateSize?.();
        map = instance;
        setTilesReady(true);
      })
      .catch(() => {
        setTilesReady(false);
      });

    return () => {
      cancelled = true;
      map?.remove();
      if (el) el.innerHTML = "";
    };
  }, [
    origin.lat,
    origin.lng,
    destination.lat,
    destination.lng,
    originLabel,
    destinationLabel,
    mode,
    line.map((point) => `${point.lat},${point.lng}`).join("|"),
  ]);

  return (
    <View style={[styles.map, { height }]}>
      {!tilesReady ? (
        <RouteSketch
          origin={origin}
          destination={destination}
          polyline={line}
          mode={mode}
          height={height}
        />
      ) : null}
      <View ref={host} style={StyleSheet.absoluteFill} />
    </View>
  );
}

const styles = StyleSheet.create({
  map: {
    width: "100%",
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#D9E4DC",
  },
});
