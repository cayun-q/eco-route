import { StyleSheet, Text, View } from "react-native";
import type { RouteEstimate } from "@carbonroute/shared";
import { colors, radius, shadow, space, type as font } from "../theme";
import { formatDuration, formatKg, formatKm } from "../format";
import { Chip } from "../ui";
import { RouteMap } from "./RouteMap";

export function MapPreview({ estimate }: { estimate: RouteEstimate }) {
  const high = estimate.mode === "plane" || estimate.co2eKg >= 20;
  return (
    <View style={styles.chrome}>
      <View style={styles.bar}>
        <Text style={styles.barKicker}>Route preview</Text>
        <Text style={styles.barTitle} numberOfLines={1}>
          {estimate.origin.label.split(",")[0]} → {estimate.destination.label.split(",")[0]}
        </Text>
      </View>
      <View style={styles.map}>
        <RouteMap
          origin={estimate.origin}
          destination={estimate.destination}
          polyline={estimate.polyline}
          mode={estimate.mode}
          legs={estimate.legs}
        />
      </View>
      {estimate.legs?.length ? (
        <View style={styles.legs}>
          {estimate.legs.map((leg, index) => (
            <View key={`${leg.mode}-${index}`} style={styles.legRow}>
              <View style={[styles.legDot, leg.mode === "car" ? styles.carDot : styles.planeDot]} />
              <View style={styles.legCopy}>
                <Text style={styles.legTitle}>{leg.summary ?? (leg.mode === "car" ? "Drive" : "Flight")}</Text>
                <Text style={styles.legMeta}>
                  {formatKm(leg.distanceKm)} · {formatDuration(leg.durationMin)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}
      <View style={styles.chips}>
        <Chip label={formatKm(estimate.distanceKm)} selected />
        <Chip label={formatDuration(estimate.durationMin)} selected tone="muted" />
        <Chip label={`${formatKg(estimate.co2eKg)} CO₂e`} selected tone={high ? "clay" : "accent"} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chrome: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: "hidden",
    ...shadow.hard,
  },
  bar: {
    backgroundColor: colors.accentSoft,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    paddingHorizontal: space.md,
    paddingVertical: 10,
    gap: 2,
  },
  barKicker: {
    fontFamily: font.bodyMed,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: colors.accentText,
  },
  barTitle: {
    fontFamily: font.display,
    fontSize: 16,
    color: colors.accentText,
  },
  map: {
    height: 300,
    backgroundColor: colors.white,
  },
  legs: {
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  legRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  legDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  carDot: { backgroundColor: "#2563EB" },
  planeDot: { backgroundColor: "#D97706" },
  legCopy: { flex: 1 },
  legTitle: {
    fontFamily: font.bodyMed,
    fontSize: 13,
    color: colors.ink,
  },
  legMeta: {
    fontFamily: font.body,
    fontSize: 12,
    color: colors.muted,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.sm,
    padding: space.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
});
