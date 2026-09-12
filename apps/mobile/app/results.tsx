import { useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import type { CreateTripRequest } from "@carbonroute/shared";
import { Card } from "@/components/Card";
import { InkButton } from "@/components/InkButton";
import { RouteMap } from "@/components/RouteMap";
import { LegBreakdown, StickyCo2 } from "@/components/TotalsBar";
import { createTrip } from "@/lib/api";
import { enqueueTrip } from "@/lib/queue";
import { readEstimate } from "@/lib/session";
import { colors } from "@/lib/theme";

export default function ResultsScreen() {
  const router = useRouter();
  const packed = readEstimate();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!packed) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>No estimate on the desk</Text>
        <Text style={styles.muted}>Build a trip first, then estimate it.</Text>
        <InkButton label="Back to Log trip" onPress={() => router.replace("/log")} />
      </View>
    );
  }

  const { estimate, request } = packed;

  async function save() {
    setBusy(true);
    setMessage(null);
    const payload = request as CreateTripRequest;
    try {
      const trip = await createTrip(payload);
      router.replace(`/trip/${trip.id}`);
    } catch {
      await enqueueTrip(payload);
      setMessage(
        "Could not reach the API. The full multi-leg itinerary is queued on this device and will sync from Home.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <Text style={styles.kicker}>Per-leg + total</Text>
      <Text style={styles.title}>
        {estimate.legs[0].origin.label} → {estimate.legs[estimate.legs.length - 1].destination.label}
      </Text>
      <View style={styles.mapBlock}>
        <RouteMap legs={estimate.legs} height={300} />
        <StickyCo2 kg={estimate.totals.co2eKg} />
      </View>
      <Card>
        <LegBreakdown legs={estimate.legs} />
      </Card>
      <Text style={styles.factorNote}>
        CO₂e from the DESNZ/DEFRA factor table, summed across legs — not a single g/km constant.
      </Text>
      {message ? <Text style={styles.note}>{message}</Text> : null}
      <InkButton label={busy ? "Saving…" : "Save itinerary"} disabled={busy} onPress={save} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, gap: 14, paddingBottom: 40, maxWidth: 720, width: "100%", alignSelf: "center" },
  empty: { flex: 1, backgroundColor: colors.bg, padding: 24, justifyContent: "center", gap: 12 },
  emptyTitle: { fontSize: 18, color: colors.ink },
  muted: { color: colors.muted },
  kicker: { fontFamily: "SpaceMono", color: colors.accent, letterSpacing: 1.2, fontSize: 11 },
  title: { fontSize: 22, color: colors.ink, fontWeight: "600" },
  mapBlock: { gap: 8 },
  factorNote: { fontFamily: "SpaceMono", fontSize: 11, color: colors.muted, lineHeight: 16 },
  note: { color: colors.plane, lineHeight: 20 },
});
