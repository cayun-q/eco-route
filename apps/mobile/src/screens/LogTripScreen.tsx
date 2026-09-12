import {
  MODE_SUBTYPES,
  modeLabel,
  subtypeLabel,
  type EstimateResult,
  type FactorSubtype,
  type GeoPoint,
  type TravelMode,
} from "@carbonroute/shared";
import { useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { RoutePreview } from "../components/RoutePreview";
import { Button, Card, Chip } from "../components/ui";
import { useApp } from "../context/AppContext";
import { getOriginFromGps } from "../lib/location";
import { hasBothEnds, localRouteGeometry } from "../lib/previewGeometry";
import { colors } from "../theme";

const SAMPLES = [
  { origin: "London", destination: "Paris", mode: "plane" as const, subtype: "short_haul" as const },
  { origin: "Manchester", destination: "London", mode: "train" as const, subtype: "electric" as const },
  { origin: "San Francisco", destination: "Los Angeles", mode: "car" as const, subtype: "ev" as const },
];

export function LogTripScreen() {
  const { estimate, saveTrip, go, factors, online } = useApp();
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [mode, setMode] = useState<TravelMode>("car");
  const [subtype, setSubtype] = useState<FactorSubtype>("petrol");
  const [originCoords, setOriginCoords] = useState<GeoPoint | null>(null);
  const [distanceMiles, setDistanceMiles] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [preview, setPreview] = useState<EstimateResult | null>(null);
  const [gpsBusy, setGpsBusy] = useState(false);
  const [busy, setBusy] = useState<"estimate" | "save" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const estimateRef = useRef(estimate);
  const requestRef = useRef(0);
  estimateRef.current = estimate;

  const ready = hasBothEnds(origin, destination);
  const geometry = ready
    ? localRouteGeometry(origin, destination, originCoords, preview?.route.destCoords)
    : null;

  const onMode = (next: TravelMode) => {
    setMode(next);
    setSubtype(MODE_SUBTYPES[next][0]);
  };

  const payload = () => ({
    origin: origin.trim(),
    destination: destination.trim(),
    mode,
    subtype,
    originCoords,
    destCoords: preview?.route.destCoords,
    distanceMiles: distanceMiles ? Number(distanceMiles) : undefined,
    durationMinutes: durationMinutes ? Number(durationMinutes) : undefined,
  });

  const onGps = async () => {
    setGpsBusy(true);
    setError(null);
    try {
      const fix = await getOriginFromGps();
      setOrigin(fix.label);
      setOriginCoords(fix.coords);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "GPS is unavailable here. Type a city name instead.",
      );
    } finally {
      setGpsBusy(false);
    }
  };

  useEffect(() => {
    if (!ready) {
      setPreview(null);
      setBusy(null);
      return;
    }

    const token = ++requestRef.current;
    setBusy("estimate");
    setError(null);
    const timer = setTimeout(() => {
      void estimateRef
        .current(payload())
        .then((result) => {
          if (token !== requestRef.current) return;
          setPreview(result);
        })
        .catch((err) => {
          if (token !== requestRef.current) return;
          setError(err instanceof Error ? err.message : "Could not estimate this route.");
        })
        .finally(() => {
          if (token === requestRef.current) setBusy(null);
        });
    }, 450);

    return () => {
      clearTimeout(timer);
    };
    // payload() reads the latest form fields; the listed deps are the ones that change it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origin, destination, mode, subtype, originCoords, distanceMiles, durationMinutes, ready]);

  const onSave = async () => {
    if (!ready) {
      setError("Add an origin and destination.");
      return;
    }
    setBusy("save");
    setError(null);
    try {
      const trip = await saveTrip({
        ...payload(),
        originCoords: preview?.route.originCoords ?? originCoords,
        destCoords: preview?.route.destCoords,
        distanceMiles: preview?.route.distanceMiles ?? payload().distanceMiles,
        durationMinutes: preview?.route.durationMinutes ?? payload().durationMinutes,
      });
      go({ name: "detail", tripId: trip.id });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save this trip.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.kicker}>Log a trip</Text>
        <Text style={styles.heading}>Plan a trip</Text>
        <Text style={styles.lede}>
          Enter origin and destination first — the map appears once both ends are set, like
          Google Maps. Emissions still come from the live factor table, not hardcoded g/km.
        </Text>

        <Card style={styles.gap}>
          <Text style={styles.label}>Origin</Text>
          <TextInput
            value={origin}
            onChangeText={(value) => {
              setOrigin(value);
              setOriginCoords(null);
            }}
            placeholder="London"
            placeholderTextColor={colors.muted}
            style={styles.input}
            autoCorrect={false}
          />
          <Button
            label={gpsBusy ? "Locating…" : "Use current location"}
            variant="ghost"
            loading={gpsBusy}
            onPress={() => void onGps()}
          />
          <Text style={styles.label}>Destination</Text>
          <TextInput
            value={destination}
            onChangeText={setDestination}
            placeholder="Paris"
            placeholderTextColor={colors.muted}
            style={styles.input}
            autoCorrect={false}
          />
        </Card>

        <Card style={styles.gap}>
          <Text style={styles.label}>Mode</Text>
          <View style={styles.row}>
            {(["car", "plane", "train"] as TravelMode[]).map((item) => (
              <Chip
                key={item}
                label={modeLabel(item)}
                selected={mode === item}
                onPress={() => onMode(item)}
              />
            ))}
          </View>
          <Text style={styles.label}>Subtype</Text>
          <View style={styles.row}>
            {MODE_SUBTYPES[mode].map((item) => (
              <Chip
                key={item}
                label={subtypeLabel(item)}
                selected={subtype === item}
                onPress={() => setSubtype(item)}
              />
            ))}
          </View>
          <Text style={styles.hint}>
            {factors.length
              ? `${factors.length} emission factors cached locally.`
              : "Factors will cache after the first successful sync."}
            {online ? "" : " Offline — add distance to log without the API."}
          </Text>
        </Card>

        {ready && geometry ? (
          <RoutePreview
            originLabel={origin.trim()}
            destinationLabel={destination.trim()}
            origin={preview?.route.originCoords ?? geometry.origin}
            destination={preview?.route.destCoords ?? geometry.destination}
            polyline={preview?.route.polyline ?? geometry.polyline}
            mode={mode}
            preview={preview}
            loading={busy === "estimate" && !preview}
          />
        ) : (
          <Card style={styles.placeholder}>
            <Text style={styles.placeholderTitle}>Route preview</Text>
            <Text style={styles.hint}>
              Add both ends to see the path, distance, duration, and estimated emissions
              before you save.
            </Text>
          </Card>
        )}

        <Card style={styles.gap}>
          <Text style={styles.label}>Distance / duration override (optional)</Text>
          <View style={styles.split}>
            <TextInput
              value={distanceMiles}
              onChangeText={setDistanceMiles}
              placeholder="Miles"
              keyboardType="decimal-pad"
              placeholderTextColor={colors.muted}
              style={[styles.input, styles.flex]}
            />
            <TextInput
              value={durationMinutes}
              onChangeText={setDurationMinutes}
              placeholder="Minutes"
              keyboardType="decimal-pad"
              placeholderTextColor={colors.muted}
              style={[styles.input, styles.flex]}
            />
          </View>
        </Card>

        <View style={styles.rowWrap}>
          {SAMPLES.map((sample) => (
            <Chip
              key={sample.origin + sample.destination}
              label={`${sample.origin} → ${sample.destination}`}
              onPress={() => {
                setOrigin(sample.origin);
                setDestination(sample.destination);
                setMode(sample.mode);
                setSubtype(sample.subtype);
                setOriginCoords(null);
                setPreview(null);
              }}
            />
          ))}
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button label="Save trip" loading={busy === "save"} onPress={() => void onSave()} />
        <Button label="Back to dashboard" variant="ghost" onPress={() => go({ name: "home" })} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, gap: 14, paddingBottom: 40 },
  kicker: { color: colors.accent, fontWeight: "700" },
  heading: { color: colors.ink, fontSize: 26, fontWeight: "800" },
  lede: { color: colors.muted, lineHeight: 20 },
  gap: { gap: 10 },
  label: { color: colors.ink, fontWeight: "700" },
  input: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    paddingHorizontal: 12,
    minHeight: 46,
    color: colors.ink,
    fontSize: 16,
  },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  rowWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  split: { flexDirection: "row", gap: 8 },
  hint: { color: colors.muted, fontSize: 13, lineHeight: 18 },
  error: { color: colors.danger, fontWeight: "600" },
  placeholder: { backgroundColor: colors.surfaceMuted, gap: 6 },
  placeholderTitle: { color: colors.ink, fontWeight: "800" },
});
