import {
  formatDuration,
  formatEmissions,
  formatMiles,
  type EstimateResult,
  type GeoPoint,
  type TravelMode,
} from "@carbonroute/shared";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { colors } from "../theme";
import { Card } from "./ui";
import { RouteMap } from "./RouteMap";

export function RoutePreview({
  originLabel,
  destinationLabel,
  origin,
  destination,
  polyline,
  mode,
  preview,
  loading,
}: {
  originLabel: string;
  destinationLabel: string;
  origin: GeoPoint;
  destination: GeoPoint;
  polyline: GeoPoint[];
  mode: TravelMode;
  preview: EstimateResult | null;
  loading: boolean;
}) {
  const chips = preview
    ? [
        { label: "Distance", value: formatMiles(preview.route.distanceMiles) },
        { label: "Duration", value: formatDuration(preview.route.durationMinutes) },
        { label: "CO₂e", value: formatEmissions(preview.emissions.gramsCo2e) },
      ]
    : [
        { label: "Distance", value: "—" },
        { label: "Duration", value: "—" },
        { label: "CO₂e", value: "—" },
      ];

  const method = preview?.routing?.method;
  const provider = preview?.routing?.provider;

  return (
    <Card style={styles.card}>
      <View style={styles.mapWell}>
        <RouteMap
          origin={origin}
          destination={destination}
          originLabel={originLabel}
          destinationLabel={destinationLabel}
          polyline={preview?.route.polyline ?? polyline}
          mode={preview?.route.mode ?? mode}
        />
        {loading ? (
          <View style={styles.loading} pointerEvents="none">
            <ActivityIndicator color={colors.accent} />
            <Text style={styles.loadingText}>Finding route…</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.chips}>
        {chips.map((chip) => (
          <View key={chip.label} style={styles.chip}>
            <Text style={styles.chipLabel}>{chip.label}</Text>
            <Text style={styles.chipValue}>{chip.value}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.hint}>
        {preview
          ? `${provider ?? "routing"} · ${method ?? "preview"} · ${preview.emissionFactor.source}`
          : "Enter both ends to preview the route before you save."}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { padding: 10, gap: 10 },
  mapWell: { position: "relative" },
  loading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(243, 246, 241, 0.45)",
    borderRadius: 16,
    gap: 8,
  },
  loadingText: { color: colors.accentText, fontWeight: "700" },
  chips: { flexDirection: "row", gap: 8 },
  chip: {
    flex: 1,
    backgroundColor: colors.accentSoft,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  chipLabel: { color: colors.accentText, fontSize: 11, fontWeight: "700" },
  chipValue: { color: colors.ink, fontWeight: "800", marginTop: 2, fontSize: 13 },
  hint: { color: colors.muted, fontSize: 12, lineHeight: 17 },
});
