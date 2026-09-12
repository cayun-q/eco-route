import { StyleSheet } from "react-native";
import { WebView } from "react-native-webview";
import type { Place, RouteLeg, TransportMode } from "@carbonroute/shared";
import { colors } from "../theme";

type Props = {
  origin: Place;
  destination: Place;
  polyline: [number, number][];
  mode: TransportMode;
  legs?: RouteLeg[];
};

const ROUTE_COLORS: Record<TransportMode, string> = {
  car: "#475569",
  ev: "#0F766E",
  bus: "#0891B2",
  bike: "#16A34A",
  walk: "#22C55E",
  plane: "#D97706",
};

function leafletHtml(origin: Place, destination: Place, polyline: [number, number][], mode: TransportMode, legs?: RouteLeg[]): string {
  const drawLegs = legs?.length ? legs.map((leg) => ({ mode: leg.mode, polyline: leg.polyline })) : [{ mode, polyline }];
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { height: 100%; margin: 0; background: ${colors.surface}; }
    .leaflet-container { background: ${colors.white}; }
    .pin { width: 14px; height: 14px; border: 2px solid ${colors.white}; box-shadow: 2px 2px 0 ${colors.ink}29; border-radius: 50%; }
    .pin-a { background: ${colors.accent}; }
    .pin-b { background: ${colors.clay}; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const origin = ${JSON.stringify(origin)};
    const destination = ${JSON.stringify(destination)};
    const polyline = ${JSON.stringify(polyline)};
    const legs = ${JSON.stringify(drawLegs)};
    const colors = ${JSON.stringify(ROUTE_COLORS)};
    const map = L.map('map', { zoomControl: true, attributionControl: true, preferCanvas: true });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap', maxZoom: 18, updateWhenIdle: true, updateWhenZooming: false
    }).addTo(map);
    for (const leg of legs) {
      L.polyline(leg.polyline, {
        color: colors[leg.mode] || '${ROUTE_COLORS.car}',
        weight: leg.mode === 'plane' ? 4 : 5,
        opacity: 0.94,
        smoothFactor: leg.mode === 'plane' ? 0.3 : 1,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map);
    }
    const boundsLine = L.polyline(polyline, { opacity: 0, weight: 0 }).addTo(map);
    const iconA = L.divIcon({ className: '', html: '<div class="pin pin-a"></div>', iconSize: [14, 14], iconAnchor: [7, 7] });
    const iconB = L.divIcon({ className: '', html: '<div class="pin pin-b"></div>', iconSize: [14, 14], iconAnchor: [7, 7] });
    L.marker([origin.lat, origin.lng], { icon: iconA, title: origin.label }).addTo(map);
    L.marker([destination.lat, destination.lng], { icon: iconB, title: destination.label }).addTo(map);
    if (boundsLine.getBounds().isValid()) map.fitBounds(boundsLine.getBounds(), { padding: [28, 28] });
    map.removeLayer(boundsLine);
  </script>
</body>
</html>`;
}

export function RouteMap({ origin, destination, polyline, mode, legs }: Props) {
  if (!polyline.length) return null;
  return <WebView originWhitelist={["*"]} source={{ html: leafletHtml(origin, destination, polyline, mode, legs) }} style={styles.fill} />;
}

const styles = StyleSheet.create({ fill: { flex: 1, backgroundColor: colors.white } });
