import {
  formatDuration,
  formatEmissions,
  formatMiles,
  greatCirclePolyline,
  householdDayEquivalent,
  modeLabel,
  subtypeLabel,
} from "@carbonroute/shared";
import { StyleSheet, Text, View } from "react-native";
import { ScrollView } from "react-native";
import { RouteMap } from "../components/RouteMap";
import { Button, Card, EmptyState } from "../components/ui";
import { useApp } from "../context/AppContext";
import { colors, modeColor } from "../theme";

export function TripDetailScreen({ tripId }: { tripId: string }) {
  const { trips, go } = useApp();
  const trip = trips.find((item) => item.id === tripId || item.clientId === tripId);

  if (!trip) {
    return (
      <View style={styles.wrap}>
        <EmptyState title="Trip not found" body="It may still be syncing, or it was cleared from the local cache." />
        <Button label="Back home" onPress={() => go({ name: "home" })} />
      </View>
    );
  }

  const { route, emissionFactor } = trip;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.wrap}>
      <Text style={styles.kicker}>Trip results</Text>
      <Text style={styles.heading}>
        {route.origin} → {route.destination}
      </Text>
      <View style={[styles.modePill, { backgroundColor: modeColor(route.mode) }]}>
        <Text style={styles.modeText}>
          {modeLabel(route.mode)} · {subtypeLabel(route.subtype)}
        </Text>
      </View>

      {route.originCoords && route.destCoords ? (
        <Card style={styles.mapCard}>
          <RouteMap
            origin={route.originCoords}
            destination={route.destCoords}
            originLabel={route.origin}
            destinationLabel={route.destination}
            polyline={route.polyline ?? greatCirclePolyline(route.originCoords, route.destCoords)}
            mode={route.mode}
            height={200}
          />
        </Card>
      ) : null}

      <Card style={styles.hero}>
        <Text style={styles.heroLabel}>Estimated emissions</Text>
        <Text style={styles.heroValue}>{formatEmissions(trip.gramsCo2e)}</Text>
        <Text style={styles.heroMeta}>
          About {householdDayEquivalent(trip.gramsCo2e)} day
          {householdDayEquivalent(trip.gramsCo2e) === 1 ? "" : "s"} of a typical household's electricity.
        </Text>
        {trip.pendingSync ? (
          <Text style={styles.queued}>Saved offline — will sync when the API is reachable.</Text>
        ) : null}
      </Card>

      <Card style={styles.stats}>
        <Stat label="Distance" value={formatMiles(route.distanceMiles)} />
        <Stat label="Duration" value={formatDuration(route.durationMinutes)} />
        <Stat label="From distance" value={formatEmissions(trip.fromDistance)} />
        <Stat label="From duration" value={formatEmissions(trip.fromDuration)} />
      </Card>

      <Card style={styles.gap}>
        <Text style={styles.section}>Emission factor used</Text>
        <Text style={styles.body}>
          {modeLabel(emissionFactor.mode)} / {subtypeLabel(emissionFactor.subtype)} · {emissionFactor.year}
        </Text>
        <Text style={styles.meta}>
          {emissionFactor.gramsCo2ePerMile != null
            ? `${emissionFactor.gramsCo2ePerMile} g CO₂e / mile`
            : "No per-mile intensity"}
          {emissionFactor.gramsCo2ePerHour != null
            ? ` · ${emissionFactor.gramsCo2ePerHour} g CO₂e / hour`
            : ""}
        </Text>
        <Text style={styles.meta}>{emissionFactor.source}</Text>
      </Card>

      <Button label="Log another trip" onPress={() => go({ name: "log" })} />
      <Button label="Back to dashboard" variant="ghost" onPress={() => go({ name: "home" })} />
    </ScrollView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  wrap: { padding: 20, gap: 14, paddingBottom: 40, flexGrow: 1 },
  kicker: { color: colors.accent, fontWeight: "700" },
  heading: { color: colors.ink, fontSize: 26, fontWeight: "800" },
  modePill: { alignSelf: "flex-start", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  modeText: { color: colors.white, fontWeight: "700" },
  hero: { paddingVertical: 22 },
  heroLabel: { color: colors.muted, fontWeight: "600" },
  heroValue: { color: colors.ink, fontSize: 36, fontWeight: "800", marginTop: 6 },
  heroMeta: { color: colors.muted, marginTop: 8, lineHeight: 20 },
  mapCard: { padding: 8 },
  queued: { color: colors.warn, marginTop: 10, fontWeight: "700" },
  stats: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  stat: { width: "46%", gap: 4 },
  statLabel: { color: colors.muted, fontWeight: "600" },
  statValue: { color: colors.ink, fontSize: 18, fontWeight: "800" },
  gap: { gap: 6 },
  section: { fontWeight: "800", color: colors.ink },
  body: { color: colors.ink },
  meta: { color: colors.muted, lineHeight: 20 },
});
