import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import type { Trip } from "@carbonroute/shared";
import { Card } from "@/components/Card";
import { RouteMap } from "@/components/RouteMap";
import { LegBreakdown, StickyCo2 } from "@/components/TotalsBar";
import { getTrip } from "@/lib/api";
import { modeArrow } from "@/lib/format";
import { colors } from "@/lib/theme";

export default function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getTrip(id)
      .then(setTrip)
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load trip"));
  }, [id]);

  if (error) {
    return (
      <View style={styles.empty}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  if (!trip) {
    return (
      <View style={styles.empty}>
        <Text style={styles.muted}>Opening trip…</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <Text style={styles.modes}>{modeArrow(trip.legs.map((l) => l.mode))}</Text>
      <Text style={styles.title}>{trip.title}</Text>
      <Text style={styles.meta}>{new Date(trip.createdAt).toLocaleString()}</Text>
      <View style={styles.mapBlock}>
        <RouteMap legs={trip.legs} height={300} />
        <StickyCo2 kg={trip.totals.co2eKg} />
      </View>
      <Card>
        <LegBreakdown legs={trip.legs} />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, gap: 14, paddingBottom: 40, maxWidth: 720, width: "100%", alignSelf: "center" },
  empty: { flex: 1, backgroundColor: colors.bg, padding: 24, justifyContent: "center" },
  error: { color: colors.danger },
  muted: { color: colors.muted },
  modes: { fontFamily: "SpaceMono", color: colors.accent, fontSize: 12 },
  title: { fontSize: 22, color: colors.ink, fontWeight: "600" },
  meta: { fontFamily: "SpaceMono", color: colors.muted, fontSize: 11 },
  mapBlock: { gap: 8 },
});
