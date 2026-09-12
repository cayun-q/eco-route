import type { GeoPoint } from "@carbonroute/shared";
import MapView, { Marker, Polyline } from "react-native-maps";
import { StyleSheet, View } from "react-native";
import { colors, modeColor } from "../theme";
import type { RouteMapProps } from "./routeMapTypes";

function regionFor(points: GeoPoint[]) {
  const lats = points.map((point) => point.lat);
  const lngs = points.map((point) => point.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max(0.08, (maxLat - minLat) * 1.7),
    longitudeDelta: Math.max(0.08, (maxLng - minLng) * 1.7),
  };
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
  const line = polyline.length >= 2 ? polyline : [origin, destination];
  const region = regionFor([origin, destination, ...line]);

  return (
    <View style={[styles.wrap, { height }]}>
      <MapView
        style={StyleSheet.absoluteFill}
        initialRegion={region}
        region={region}
        scrollEnabled
        zoomEnabled
        rotateEnabled={false}
        pitchEnabled={false}
        toolbarEnabled={false}
      >
        <Polyline
          coordinates={line.map((point) => ({
            latitude: point.lat,
            longitude: point.lng,
          }))}
          strokeColor={modeColor(mode)}
          strokeWidth={5}
        />
        <Marker
          coordinate={{ latitude: origin.lat, longitude: origin.lng }}
          title={originLabel || "Start"}
          pinColor={colors.accent}
        />
        <Marker
          coordinate={{ latitude: destination.lat, longitude: destination.lng }}
          title={destinationLabel || "End"}
          pinColor={colors.plane}
        />
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#D9E4DC",
  },
});
