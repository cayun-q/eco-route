import {
  MODE_SUBTYPES,
  formatEmissions,
  formatMiles,
  modeLabel,
  subtypeLabel,
  type EstimateResult,
  type FactorSubtype,
  type GeoPoint,
  type TravelMode,
} from "@carbonroute/shared";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Button, Card, Chip } from "../components/ui";
import { useApp } from "../context/AppContext";
import { getOriginFromGps } from "../lib/location";
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

  const onMode = (next: TravelMode) => {
    setMode(next);
    setSubtype(MODE_SUBTYPES[next][0]);
    setPreview(null);
  };

  const payload = () => ({
    origin: origin.trim(),
    destination: destination.trim(),
    mode,
    subtype,
    originCoords,
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

  const onEstimate = async () => {
    if (!origin.trim() || !destination.trim()) {
      setError("Add an origin and destination.");
      return;
    }
    setBusy("estimate");
    setError(null);
    try {
      setPreview(await estimate(payload()));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not estimate this route.");
    } finally {
      setBusy(null);
    }
  };

  const onSave = async () => {
    if (!origin.trim() || !destination.trim()) {
      setError("Add an origin and destination.");
      return;
    }
    setBusy("save");
    setError(null);
    try {
      const trip = await saveTrip(payload());
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
        <Text style={styles.heading}>Where did you travel?</Text>
        <Text style={styles.lede}>
          Distance comes from the routing stub (haversine for flights, mock road/rail for the rest).
          Drop a Mapbox or Google key on the API later — the app already talks to the same interface.
        </Text>

        <Card style={styles.gap}>
          <Text style={styles.label}>Origin</Text>
          <TextInput
            value={origin}
            onChangeText={(value) => {
              setOrigin(value);
              setOriginCoords(null);
              setPreview(null);
            }}
            placeholder="London"
            placeholderTextColor={colors.muted}
            style={styles.input}
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
            onChangeText={(value) => {
              setDestination(value);
              setPreview(null);
            }}
            placeholder="Paris"
            placeholderTextColor={colors.muted}
            style={styles.input}
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
                onPress={() => {
                  setSubtype(item);
                  setPreview(null);
                }}
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

        {preview ? (
          <Card style={styles.preview}>
            <Text style={styles.previewLabel}>Estimated emissions</Text>
            <Text style={styles.previewValue}>
              {formatEmissions(preview.emissions.gramsCo2e)}
            </Text>
            <Text style={styles.hint}>
              {formatMiles(preview.route.distanceMiles)} · {Math.round(preview.route.durationMinutes)} min ·{" "}
              {preview.emissionFactor.source}
            </Text>
          </Card>
        ) : null}

        <Button
          label="Estimate emissions"
          variant="ghost"
          loading={busy === "estimate"}
          onPress={() => void onEstimate()}
        />
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
  preview: { backgroundColor: colors.accentSoft, borderColor: "#B9E4CB" },
  previewLabel: { color: colors.accentText, fontWeight: "700" },
  previewValue: { color: colors.ink, fontSize: 28, fontWeight: "800" },
});
