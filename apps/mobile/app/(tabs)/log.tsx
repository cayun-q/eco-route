import { buildAutoLegs, type EstimateResponse, type Place, type TravelMode } from "@carbonroute/shared";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Card } from "@/components/Card";
import { InkButton } from "@/components/InkButton";
import { ModeChip } from "@/components/ModeChip";
import { PlaceField } from "@/components/PlaceField";
import { RouteMap } from "@/components/RouteMap";
import { LegBreakdown, StickyCo2 } from "@/components/TotalsBar";
import { estimateTrip } from "@/lib/api";
import { stashEstimate } from "@/lib/session";
import { colors } from "@/lib/theme";

function toRef(place: Place) {
  return { label: place.label, lat: place.lat, lng: place.lng, iata: place.iata };
}

export default function LogTripScreen() {
  const router = useRouter();
  const [origin, setOrigin] = useState<Place | null>(null);
  const [destination, setDestination] = useState<Place | null>(null);
  const [mode, setMode] = useState<TravelMode>("car");
  const [estimate, setEstimate] = useState<EstimateResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoKey = useRef("");

  const ready = Boolean(origin && destination);
  const autoLegs = useMemo(
    () => (origin && destination ? buildAutoLegs(origin, destination, mode) : []),
    [origin, destination, mode],
  );

  function setEnd(which: "origin" | "destination", place: Place | null) {
    setEstimate(null);
    autoKey.current = "";
    if (which === "origin") setOrigin(place);
    else setDestination(place);
  }

  async function runEstimate(fromAuto = false) {
    if (!origin || !destination || autoLegs.length === 0) {
      if (!fromAuto) setError("Pick an origin and a destination — the map shows up right after.");
      return;
    }
    setBusy(true);
    setError(null);
    const payload = {
      legs: autoLegs.map((leg) => ({
        mode: leg.mode,
        origin: toRef(leg.origin),
        destination: toRef(leg.destination),
      })),
    };
    try {
      const next = await estimateTrip(payload);
      setEstimate(next);
      stashEstimate(next, payload);
    } catch (err) {
      if (!fromAuto) setError(err instanceof Error ? err.message : "Estimate failed");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!ready || autoLegs.length === 0) return;
    const key = autoLegs
      .map((leg) => `${leg.mode}:${leg.origin.id}:${leg.destination.id}`)
      .join("|");
    if (key === autoKey.current) return;
    const handle = setTimeout(() => {
      autoKey.current = key;
      runEstimate(true);
    }, 280);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, autoLegs]);

  const mapLegs =
    estimate?.legs ??
    autoLegs.map((leg, seq) => ({
      seq,
      mode: leg.mode,
      origin: leg.origin,
      destination: leg.destination,
      polyline: [leg.origin, leg.destination],
    }));

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <Text style={styles.lede}>Where to? Set both ends and the route inks itself.</Text>

      <Card style={{ zIndex: 8 }}>
        <View style={styles.modes}>
          {(["car", "plane", "train"] as TravelMode[]).map((item) => (
            <ModeChip
              key={item}
              mode={item}
              selected={mode === item}
              onPress={() => {
                setMode(item);
                setEstimate(null);
                autoKey.current = "";
              }}
            />
          ))}
        </View>
        <PlaceField label="Origin" value={origin} onChange={(place) => setEnd("origin", place)} />
        <View style={{ height: 10 }} />
        <PlaceField
          label="Destination"
          value={destination}
          onChange={(place) => setEnd("destination", place)}
        />
      </Card>

      {ready ? (
        <View style={styles.mapBlock}>
          <RouteMap legs={mapLegs} />
          {estimate ? <StickyCo2 kg={estimate.totals.co2eKg} /> : null}
        </View>
      ) : (
        <View style={styles.wait}>
          <Text style={styles.waitTitle}>Map’s warming up</Text>
          <Text style={styles.waitCopy}>Drop in origin and destination — we’ll draw the line.</Text>
        </View>
      )}

      {estimate ? (
        <Card>
          <Text style={styles.breakKicker}>
            {estimate.legs.length > 1 ? "Auto legs" : "This hop"}
          </Text>
          <LegBreakdown legs={estimate.legs} />
        </Card>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <InkButton
        label={busy ? "Estimating…" : "Estimate trip"}
        disabled={busy || !ready}
        onPress={() => runEstimate(false)}
      />

      {estimate ? (
        <InkButton tone="ink" label="Review and save" onPress={() => router.push("/results")} />
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, gap: 14, paddingBottom: 48, maxWidth: 720, width: "100%", alignSelf: "center" },
  lede: { color: colors.ink, fontSize: 16, lineHeight: 22, fontWeight: "600" },
  modes: { flexDirection: "row", gap: 8, marginBottom: 14 },
  mapBlock: { gap: 8 },
  wait: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    borderStyle: "dashed",
    paddingVertical: 22,
    paddingHorizontal: 16,
    backgroundColor: colors.surfaceMuted,
  },
  waitTitle: { fontFamily: "SpaceMono", color: colors.accent, fontSize: 13, marginBottom: 4 },
  waitCopy: { color: colors.ink, fontSize: 15, lineHeight: 21 },
  breakKicker: {
    fontFamily: "SpaceMono",
    color: colors.accentText,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  error: { color: colors.danger, fontFamily: "SpaceMono" },
});
