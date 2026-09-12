import { StyleSheet } from "react-native";
import { WebView } from "react-native-webview";
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

function strokeFor(mode?: TransportMode, strokeColor?: string): string {
  if (strokeColor) return strokeColor;
  if (mode === "car") return colors.mode.car;
  if (mode === "plane") return colors.mode.plane;
  if (mode === "train") return colors.mode.train;
  return colors.ink;
}

function leafletHtml(
  origin: Place,
  destination: Place,
  polyline: [number, number][],
  stroke: string,
  connectors: [number, number][][],
): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { height: 100%; margin: 0; background: ${colors.surface}; }
    .leaflet-container { background: ${colors.white}; }
    .pin { width: 14px; height: 14px; border: 2px solid ${colors.white}; box-shadow: 2px 2px 0 ${colors.ink}29; }
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
    const connectors = ${JSON.stringify(connectors)};
    const map = L.map('map', { zoomControl: true, attributionControl: true });
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles © Esri — Source: Esri, OpenStreetMap',
      maxZoom: 18
    }).addTo(map);
    const layers = [];
    const line = L.polyline(polyline, { color: '${stroke}', weight: 3.75, opacity: 0.95 }).addTo(map);
    layers.push(line);
    for (const c of connectors) {
      if (!c || c.length < 2) continue;
      layers.push(L.polyline(c, { color: '${colors.muted}', weight: 2, opacity: 0.7, dashArray: '6 6' }).addTo(map));
    }
    const iconA = L.divIcon({ className: '', html: '<div class="pin pin-a"></div>', iconSize: [14, 14], iconAnchor: [7, 7] });
    const iconB = L.divIcon({ className: '', html: '<div class="pin pin-b"></div>', iconSize: [14, 14], iconAnchor: [7, 7] });
    L.marker([origin.lat, origin.lng], { icon: iconA, title: origin.label }).addTo(map);
    L.marker([destination.lat, destination.lng], { icon: iconB, title: destination.label }).addTo(map);
    map.fitBounds(L.featureGroup(layers).getBounds(), { padding: [28, 28] });
  </script>
</body>
</html>`;
}

export function RouteMap({ origin, destination, polyline, mode, strokeColor, connectors = [] }: Props) {
  if (!polyline.length) return null;
  const stroke = strokeFor(mode, strokeColor);
  return (
    <WebView
      originWhitelist={["*"]}
      source={{ html: leafletHtml(origin, destination, polyline, stroke, connectors) }}
      style={styles.fill}
    />
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    backgroundColor: colors.white,
  },
});
