import { Pressable, StyleSheet, Text, View } from "react-native";
import type { Trip } from "@carbonroute/shared";
import { colors, radius, shadow, space, type as font } from "../theme";
import { formatDate, formatKg, formatKm, modeLabel } from "../format";
import { Chip } from "../ui";

const ROAD_WORDS = /\b(?:street|st|road|rd|avenue|ave|lane|ln|drive|dr|boulevard|blvd|court|ct|circle|cir|way|highway|hwy|parkway|pkwy|place|pl|terrace|ter|trail|trl)\.?$/i;

function ledgerPlace(label: string): string {
  const parts = label
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (!parts.length) return label;

  // Airport labels are already concise and useful, e.g. "JFK — John F Kennedy...".
  if (/^[A-Z]{3}\s+[—-]/.test(parts[0])) {
    const airportCity = parts[1];
    return airportCity || parts[0].slice(0, 3);
  }

  // Nominatim address labels can start with either "117 Kingsridge Lane" or
  // separate chunks such as "117, Kingsridge Lane, Arden, ...". Skip the
  // house number and street name, then use the first locality/general area.
  for (const part of parts) {
    if (/^\d+[A-Za-z-]*$/.test(part)) continue;
    if (/^\d+\s+/.test(part)) continue;
    if (ROAD_WORDS.test(part)) continue;
    return part;
  }

  return parts[0];
}

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
          {ledgerPlace(trip.originLabel)} → {ledgerPlace(trip.destinationLabel)}
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
