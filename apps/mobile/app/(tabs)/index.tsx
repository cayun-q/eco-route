import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { Trip } from "@carbonroute/shared";
import { Card } from "@/components/Card";
import { InkButton } from "@/components/InkButton";
import { TotalsBar } from "@/components/TotalsBar";
import { listTrips } from "@/lib/api";
import { formatKg, modeArrow } from "@/lib/format";
import { flushQueue, listQueued, type QueuedSave } from "@/lib/queue";
import { colors } from "@/lib/theme";

export default function HomeScreen() {
  const router = useRouter();
  const [trips, setTrips] = useState<Trip[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [queue, setQueue] = useState<QueuedSave[]>([]);
  const [syncing, setSyncing] = useState(false);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const flushed = await flushQueue();
      setQueue(flushed.remaining);
      const { trips: next } = await listTrips();
      setTrips(next);
    } catch (err) {
      setQueue(await listQueued());
      setError(err instanceof Error ? err.message : "Could not load trips");
      setTrips((prev) => prev ?? []);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const monthKg = (trips ?? []).reduce((sum, trip) => sum + trip.totals.co2eKg, 0);

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <Text style={styles.kicker}>Field notes</Text>
      <Text style={styles.lede}>
        Plan realistic itineraries — drive to the airport, fly, drive onward — and see CO₂e from DESNZ/DEFRA
        factors, not a hardcoded g/km guess.
      </Text>

      <Card>
        <Text style={styles.cardEyebrow}>Logged so far</Text>
        <Text style={styles.hero}>{trips === null ? "…" : formatKg(monthKg)}</Text>
        <Text style={styles.heroSub}>sum of saved multi-leg trips</Text>
        <InkButton label="Log a trip" onPress={() => router.push("/log")} />
      </Card>

      {queue.length > 0 ? (
        <Card style={styles.warn}>
          <Text style={styles.warnTitle}>
            {queue.length} itinerar{queue.length === 1 ? "y" : "ies"} waiting to sync
          </Text>
          <Text style={styles.warnCopy}>
            Full multi-leg payloads stay on this device until the API is reachable.
          </Text>
          <InkButton
            label={syncing ? "Syncing…" : "Retry sync"}
            disabled={syncing}
            onPress={async () => {
              setSyncing(true);
              await refresh();
              setSyncing(false);
            }}
          />
        </Card>
      ) : null}

      {error ? (
        <Card>
          <Text style={styles.error}>{error}</Text>
          <Text style={styles.muted}>Trips still on this device will sync when the API is back.</Text>
        </Card>
      ) : null}

      <Text style={styles.section}>Recent itineraries</Text>
      {trips === null ? <Text style={styles.muted}>Loading trips…</Text> : null}
      {trips?.length === 0 && !error ? (
        <Card>
          <Text style={styles.emptyTitle}>No trips inked yet</Text>
          <Text style={styles.muted}>
            Pick origin and destination. Plane trips auto-split into drive–fly–drive when airports sit nearby.
          </Text>
        </Card>
      ) : null}

      {trips?.map((trip) => (
        <Pressable key={trip.id} onPress={() => router.push(`/trip/${trip.id}`)}>
          <Card>
            <Text style={styles.tripTitle}>{trip.title}</Text>
            <Text style={styles.tripModes}>{modeArrow(trip.legs.map((l) => l.mode))}</Text>
            <View style={{ height: 10 }} />
            <TotalsBar totals={trip.totals} />
            <Text style={styles.tripMeta}>
              {trip.legs.length} leg{trip.legs.length === 1 ? "" : "s"} ·{" "}
              {new Date(trip.createdAt).toLocaleString()}
            </Text>
          </Card>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, gap: 14, paddingBottom: 40, maxWidth: 720, width: "100%", alignSelf: "center" },
  kicker: {
    fontFamily: "SpaceMono",
    color: colors.accent,
    letterSpacing: 1.4,
    fontSize: 11,
    textTransform: "uppercase",
  },
  lede: { color: colors.ink, fontSize: 16, lineHeight: 22 },
  cardEyebrow: {
    fontFamily: "SpaceMono",
    fontSize: 11,
    color: colors.muted,
    textTransform: "uppercase",
  },
  hero: { fontFamily: "SpaceMono", fontSize: 36, color: colors.ink, marginVertical: 4 },
  heroSub: { color: colors.muted, marginBottom: 12 },
  section: {
    fontFamily: "SpaceMono",
    fontSize: 12,
    letterSpacing: 1,
    color: colors.accentText,
    textTransform: "uppercase",
    marginTop: 8,
  },
  tripTitle: { fontSize: 17, color: colors.ink, fontWeight: "600" },
  tripModes: { fontFamily: "SpaceMono", color: colors.accent, marginTop: 4, fontSize: 12 },
  tripMeta: { fontFamily: "SpaceMono", color: colors.muted, fontSize: 11, marginTop: 10 },
  emptyTitle: { fontSize: 16, color: colors.ink, marginBottom: 6 },
  muted: { color: colors.muted, lineHeight: 20 },
  error: { color: colors.danger, marginBottom: 6 },
  warn: { backgroundColor: colors.warnSoft },
  warnTitle: { fontFamily: "SpaceMono", color: colors.plane, marginBottom: 6 },
  warnCopy: { color: colors.muted, marginBottom: 10 },
});
