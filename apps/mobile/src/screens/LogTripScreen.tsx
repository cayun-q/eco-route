import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RouteEstimate, TransportMode } from "@carbonroute/shared";
import type { RootStackParamList } from "../navigation";
import { api } from "../api";
import { offlineEstimate } from "../offline";
import { useStore } from "../store";
import { colors, space, type as font } from "../theme";
import { Button, Chip, Field, Heading, Muted, Screen } from "../ui";
import { MapPreview } from "../components/MapPreview";
import { vsDrivingCopy } from "../format";

type Props = NativeStackScreenProps<RootStackParamList, "LogTrip">;

const MODES: TransportMode[] = ["car", "plane", "train"];

export function LogTripScreen({ navigation }: Props) {
  const { factors, saveTrip } = useStore();
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [mode, setMode] = useState<TransportMode>("train");
  const [estimate, setEstimate] = useState<RouteEstimate | null>(null);
  const [estimating, setEstimating] = useState(false);
  const [estimateError, setEstimateError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const bothEnds = origin.trim().length > 0 && destination.trim().length > 0;

  useEffect(() => {
    if (!bothEnds) {
      setEstimate(null);
      setEstimateError(null);
      setEstimating(false);
      return;
    }
    let cancelled = false;
    setEstimating(true);
    setEstimateError(null);
    const handle = setTimeout(async () => {
      try {
        const result = await api.estimate({
          origin: origin.trim(),
          destination: destination.trim(),
          mode,
        });
        if (!cancelled) setEstimate(result);
      } catch (err) {
        try {
          const fallback = offlineEstimate(origin.trim(), destination.trim(), mode, factors);
          if (!cancelled) setEstimate(fallback);
        } catch {
          if (!cancelled) {
            setEstimate(null);
            setEstimateError(err instanceof Error ? err.message : "Could not preview this route.");
          }
        }
      } finally {
        if (!cancelled) setEstimating(false);
      }
    }, 450);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [origin, destination, mode, bothEnds, factors]);

  const compare = useMemo(() => vsDrivingCopy(estimate?.vsDrivingKg), [estimate]);

  async function onSave() {
    if (!estimate) return;
    setSaving(true);
    setSaveError(null);
    try {
      const trip = await saveTrip({
        originLabel: estimate.origin.label,
        destinationLabel: estimate.destination.label,
        originLat: estimate.origin.lat,
        originLng: estimate.origin.lng,
        destLat: estimate.destination.lat,
        destLng: estimate.destination.lng,
        mode: estimate.mode,
        distanceKm: estimate.distanceKm,
        durationMin: estimate.durationMin,
        co2eKg: estimate.co2eKg,
        polyline: estimate.polyline,
        factorGPerKm: estimate.factor.gPerKm,
        factorSource: estimate.factor.source,
      });
      navigation.replace("Results", { trip });
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Could not save this trip.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
          <Heading>Log trip</Heading>
          <Muted>Enter origin and destination first. The map appears only after both ends are set.</Muted>

          <Field
            label="Origin"
            value={origin}
            onChangeText={setOrigin}
            placeholder="Portland, OR"
            autoCapitalize="words"
          />
          <Field
            label="Destination"
            value={destination}
            onChangeText={setDestination}
            placeholder="Seattle, WA"
            autoCapitalize="words"
          />

          <Text style={styles.modeLabel}>Mode</Text>
          <View style={styles.modes}>
            {MODES.map((m) => (
              <Chip
                key={m}
                label={m[0].toUpperCase() + m.slice(1)}
                selected={mode === m}
                tone={m}
                onPress={() => setMode(m)}
              />
            ))}
          </View>

          {!bothEnds ? (
            <View style={styles.hold}>
              <Text style={styles.holdTitle}>Waiting on both ends</Text>
              <Text style={styles.holdBody}>
                Add a start and a finish. CarbonRoute will plot markers, a polyline, and distance / duration / CO₂e
                chips.
              </Text>
            </View>
          ) : null}

          {bothEnds && estimating && !estimate ? (
            <View style={styles.hold}>
              <ActivityIndicator color={colors.accent} />
              <Text style={styles.holdBody}>Plotting the route…</Text>
            </View>
          ) : null}

          {estimateError ? <Text style={styles.error}>{estimateError}</Text> : null}

          {estimate ? (
            <View style={styles.preview}>
              <MapPreview estimate={estimate} />
              <Text style={styles.factor}>
                {estimate.factor.gPerKm} g/km · {estimate.factor.source}
                {estimate.offline ? " · offline cache" : ` · ${estimate.provider}`}
              </Text>
              {compare ? <Text style={styles.compare}>{compare}</Text> : null}
            </View>
          ) : null}

          {saveError ? <Text style={styles.error}>{saveError}</Text> : null}

          <Button
            label={saving ? "Saving…" : "Save trip"}
            onPress={() => void onSave()}
            disabled={!estimate || saving}
          />
          <Button label="Cancel" variant="ghost" onPress={() => navigation.goBack()} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  wrap: {
    padding: space.lg,
    paddingTop: space.xl,
    maxWidth: 520,
    width: "100%",
    alignSelf: "center",
    gap: space.md,
    paddingBottom: 48,
  },
  modeLabel: {
    fontFamily: font.bodyMed,
    fontSize: 13,
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginTop: space.xs,
  },
  modes: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.sm,
  },
  hold: {
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space.lg,
    gap: space.sm,
  },
  holdTitle: {
    fontFamily: font.display,
    fontSize: 18,
    color: colors.ink,
  },
  holdBody: {
    fontFamily: font.body,
    fontSize: 14,
    lineHeight: 21,
    color: colors.muted,
  },
  preview: {
    gap: space.sm,
  },
  factor: {
    fontFamily: font.body,
    fontSize: 13,
    color: colors.muted,
  },
  compare: {
    fontFamily: font.bodyMed,
    fontSize: 14,
    color: colors.accentText,
  },
  error: {
    fontFamily: font.body,
    fontSize: 14,
    color: colors.danger,
  },
});
