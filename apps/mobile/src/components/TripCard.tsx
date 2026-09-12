import { Pressable, StyleSheet, Text, View } from "react-native";
import type { Trip } from "@carbonroute/shared";
import { colors, radius, shadow, space, type as font } from "../theme";
import { formatDate, formatKg, formatKm, modeLabel, placeDisplayLabel } from "../format";
import { Chip } from "../ui";

export function TripCard({ trip, onPress }: { trip: Trip; onPress: () => void }) {
  const high = trip.mode === "plane" || trip.co2eKg >= 20;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.top}>
        <Text style={styles.route} numberOfLines={2}>
          {placeDisplayLabel(trip.originLabel)} → {placeDisplayLabel(trip.destinationLabel)}
        </Text>
        <Chip label={modeLabel(trip.mode)} selected tone={trip.mode} />
      </View>
      <Text style={styles.meta}>
        {formatKm(trip.distanceKm)} · {formatKg(trip.co2eKg)} CO₂e
        {trip.pending ? " · queued" : ""}
      </Text>
      <Text style={styles.date}>{formatDate(trip.createdAt)}</Text>
      {high ? <Text style={styles.high}>High-emission trip</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space.lg,
    gap: 6,
    ...shadow.hard,
  },
  pressed: {
    backgroundColor: colors.surfaceMuted,
  },
  top: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: space.md,
  },
  route: {
    flex: 1,
    fontFamily: font.display,
    fontSize: 18,
    color: colors.ink,
  },
  meta: {
    fontFamily: font.bodyMed,
    fontSize: 14,
    color: colors.ink,
  },
  date: {
    fontFamily: font.body,
    fontSize: 13,
    color: colors.muted,
  },
  high: {
    fontFamily: font.bodyMed,
    fontSize: 12,
    color: colors.clay,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});
