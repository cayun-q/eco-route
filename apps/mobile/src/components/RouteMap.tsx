import { StyleSheet } from "react-native";
import { WebView } from "react-native-webview";
import type { Place } from "@carbonroute/shared";
import { colors } from "../theme";

type Props = {
  origin: Place;
  destination: Place;
  polyline: [number, number][];
};

function leafletHtml(origin: Place, destination: Place, polyline: [number, number][]): string {
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
    const map = L.map('map', { zoomControl: true, attributionControl: true });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 18
    }).addTo(map);
    const line = L.polyline(polyline, { color: '${colors.ink}', weight: 4, opacity: 0.92 }).addTo(map);
    const iconA = L.divIcon({ className: '', html: '<div class="pin pin-a"></div>', iconSize: [14, 14], iconAnchor: [7, 7] });
    const iconB = L.divIcon({ className: '', html: '<div class="pin pin-b"></div>', iconSize: [14, 14], iconAnchor: [7, 7] });
    L.marker([origin.lat, origin.lng], { icon: iconA, title: origin.label }).addTo(map);
    L.marker([destination.lat, destination.lng], { icon: iconB, title: destination.label }).addTo(map);
    map.fitBounds(line.getBounds(), { padding: [28, 28] });
  </script>
</body>
</html>`;
}

export function RouteMap({ origin, destination, polyline }: Props) {
  if (!polyline.length) return null;
  return (
    <WebView
      originWhitelist={["*"]}
      source={{ html: leafletHtml(origin, destination, polyline) }}
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
