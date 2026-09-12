import {
  formatDuration,
  formatEmissions,
  formatMiles,
  modeLabel,
  subtypeLabel,
  type Trip,
} from "@carbonroute/shared";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, modeColor } from "../theme";

export function TripCard({ trip, onPress }: { trip: Trip; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}>
      <View style={[styles.badge, { backgroundColor: modeColor(trip.route.mode) }]}>
        <Text style={styles.badgeText}>{modeLabel(trip.route.mode).slice(0, 1)}</Text>
      </View>
      <View style={styles.meta}>
        <Text style={styles.title} numberOfLines={1}>
          {trip.route.origin} → {trip.route.destination}
        </Text>
        <Text style={styles.sub}>
          {subtypeLabel(trip.route.subtype)} · {formatMiles(trip.route.distanceMiles)} ·{" "}
          {formatDuration(trip.route.durationMinutes)}
          {trip.pendingSync ? " · queued" : ""}
        </Text>
      </View>
      <Text style={styles.emissions}>{formatEmissions(trip.gramsCo2e)}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
  },
  badge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    color: colors.white,
    fontWeight: "800",
  },
  meta: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: colors.ink,
    fontWeight: "700",
    fontSize: 15,
  },
  sub: {
    color: colors.muted,
    marginTop: 2,
    fontSize: 12,
  },
  emissions: {
    color: colors.accentText,
    fontWeight: "700",
  },
});
