import { getPlace, type EstimateResponse, type Place, type TravelMode } from "@carbonroute/shared";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Card } from "@/components/Card";
import { InkButton } from "@/components/InkButton";
import { ModeChip } from "@/components/ModeChip";
import { PlaceField } from "@/components/PlaceField";
import { RouteMap } from "@/components/RouteMap";
import { LegBreakdown, StickyCo2 } from "@/components/TotalsBar";
import { estimateTrip } from "@/lib/api";
import { stashEstimate } from "@/lib/session";
import { colors } from "@/lib/theme";

type DraftLeg = {
  key: string;
  mode: TravelMode;
  origin: Place | null;
  destination: Place | null;
};

function newLeg(mode: TravelMode, origin: Place | null = null): DraftLeg {
  return { key: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, mode, origin, destination: null };
}

function flightWithDrives(): DraftLeg[] {
  return [newLeg("car"), newLeg("plane"), newLeg("car")];
}

function sampleSfoJfk(): DraftLeg[] {
  return [
    { ...newLeg("car"), origin: getPlace("sf")!, destination: getPlace("sfo")! },
    { ...newLeg("plane"), origin: getPlace("sfo")!, destination: getPlace("jfk")! },
    { ...newLeg("car"), origin: getPlace("jfk")!, destination: getPlace("brooklyn")! },
  ];
}

function samePlace(a: Place | null, b: Place | null): boolean {
  if (!a || !b) return false;
  return a.id === b.id || (a.lat === b.lat && a.lng === b.lng && a.label === b.label);
}

function toRef(place: Place) {
  return { label: place.label, lat: place.lat, lng: place.lng, iata: place.iata };
}

export default function LogTripScreen() {
  const router = useRouter();
  const [legs, setLegs] = useState<DraftLeg[]>([newLeg("car")]);
  const [estimate, setEstimate] = useState<EstimateResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoKey = useRef("");

  const complete = useMemo(
    () => legs.filter((leg) => leg.origin && leg.destination),
    [legs],
  );

  function update(key: string, patch: Partial<DraftLeg>) {
    setEstimate(null);
    setLegs((prev) =>
      prev.map((leg, index) => {
        const prevLeg = prev[index - 1];
        if (leg.key === key) return { ...leg, ...patch };
        if (
          patch.destination &&
          prevLeg?.key === key &&
          (!leg.origin || samePlace(leg.origin, prevLeg.destination))
        ) {
          return { ...leg, origin: patch.destination };
        }
        return leg;
      }),
    );
  }

  async function runEstimate(fromAuto = false) {
    if (complete.length === 0) {
      if (!fromAuto) setError("Give at least one leg both an origin and a destination.");
      return;
    }
    setBusy(true);
    setError(null);
    const payload = {
      legs: complete.map((leg) => ({
        mode: leg.mode,
        origin: toRef(leg.origin!),
        destination: toRef(leg.destination!),
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
    const key = complete
      .map((leg) => `${leg.mode}:${leg.origin!.id}:${leg.destination!.id}`)
      .join("|");
    if (!key || key === autoKey.current) return;
    const handle = setTimeout(() => {
      autoKey.current = key;
      runEstimate(true);
    }, 350);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [complete]);

  const mapLegs =
    estimate?.legs ??
    complete.map((leg, seq) => ({
      seq,
      mode: leg.mode,
      origin: leg.origin!,
      destination: leg.destination!,
      polyline: [leg.origin!, leg.destination!],
    }));

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <Text style={styles.lede}>
        One trip is an ordered list of legs. The next origin copies the last destination — edit it if you
        need to.
      </Text>

      <View style={styles.presets}>
        <InkButton
          tone="ghost"
          label="Flight with drives"
          onPress={() => {
            setEstimate(null);
            autoKey.current = "";
            setLegs(flightWithDrives());
          }}
        />
        <InkButton
          tone="ghost"
          label="Sample SFO → JFK"
          onPress={() => {
            setEstimate(null);
            setError(null);
            autoKey.current = "";
            setLegs(sampleSfoJfk());
          }}
        />
      </View>

      <View style={styles.mapBlock}>
        <RouteMap legs={mapLegs} />
        {estimate ? <StickyCo2 kg={estimate.totals.co2eKg} /> : null}
      </View>

      {estimate ? (
        <Card>
          <LegBreakdown legs={estimate.legs} />
        </Card>
      ) : null}

      {legs.map((leg, index) => (
        <View key={leg.key} style={{ zIndex: 40 - index }}>
          {index > 0 ? (
            <View style={styles.connector} accessibilityRole="none">
              <View style={styles.connectorLine} />
            </View>
          ) : null}
          <Card>
            <View style={styles.legHead}>
              <Text style={styles.legTitle}>Leg {index + 1}</Text>
              {legs.length > 1 ? (
                <Pressable
                  onPress={() => {
                    setEstimate(null);
                    autoKey.current = "";
                    setLegs((prev) => prev.filter((item) => item.key !== leg.key));
                  }}
                >
                  <Text style={styles.remove}>Remove</Text>
                </Pressable>
              ) : null}
            </View>
            <View style={styles.modes}>
              {(["car", "plane", "train"] as TravelMode[]).map((mode) => (
                <ModeChip
                  key={mode}
                  mode={mode}
                  selected={leg.mode === mode}
                  onPress={() => update(leg.key, { mode })}
                />
              ))}
            </View>
            <PlaceField
              label="Origin"
              mode={leg.mode}
              value={leg.origin}
              onChange={(origin) => update(leg.key, { origin })}
            />
            <View style={{ height: 10 }} />
            <PlaceField
              label="Destination"
              mode={leg.mode}
              value={leg.destination}
              onChange={(destination) => update(leg.key, { destination })}
            />
          </Card>
        </View>
      ))}

      <InkButton
        tone="ghost"
        label="Add leg"
        onPress={() => {
          const last = legs[legs.length - 1];
          setLegs((prev) => [...prev, newLeg("car", last?.destination ?? null)]);
        }}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <InkButton
        label={busy ? "Estimating…" : "Estimate itinerary"}
        disabled={busy}
        onPress={() => runEstimate(false)}
      />

      {estimate ? (
        <InkButton tone="ink" label="Review and save" onPress={() => router.push("/results")} />
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.paper },
  content: { padding: 16, gap: 12, paddingBottom: 48, maxWidth: 720, width: "100%", alignSelf: "center" },
  lede: { color: colors.ink, fontSize: 15, lineHeight: 21 },
  presets: { gap: 8 },
  mapBlock: { gap: 8 },
  connector: { alignItems: "center", height: 16, justifyContent: "center" },
  connectorLine: { width: 1, height: 16, backgroundColor: colors.line },
  legHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  legTitle: { fontFamily: "SpaceMono", color: colors.ink, fontSize: 13, letterSpacing: 0.6 },
  remove: { fontFamily: "SpaceMono", color: colors.danger, fontSize: 12 },
  modes: { flexDirection: "row", gap: 8, marginBottom: 12 },
  error: { color: colors.danger, fontFamily: "SpaceMono" },
});
