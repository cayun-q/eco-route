import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  calculateEcoScore,
  type LogMethod,
  type Place,
  type RouteEstimate,
  type RouteLeg,
  type TransportMode,
} from "@carbonroute/shared";
import type { RootStackParamList } from "../navigation";
import { api } from "../api";
import { useStore } from "../store";
import { colorsForTheme, radius, shadowFor, space, type as font, type ThemeColors } from "../theme";
import { Button, Chip, Field, Heading, Muted, Screen } from "../ui";
import { MapPreview } from "../components/MapPreview";
import { comparisonCopy, formatDuration, formatFactor, formatKg, formatKm, modeLabel } from "../format";

type Props = NativeStackScreenProps<RootStackParamList, "LogTrip">;

const MODES: TransportMode[] = ["car", "ev", "bus", "bike", "walk", "plane"];
type RoadStatus = "idle" | "checking" | "available" | "unavailable";
type ManualLegDraft = { origin: string; destination: string; mode: TransportMode };

type AddressSearchProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
};

function needsDrivingNetwork(mode: TransportMode): boolean {
  return mode === "car" || mode === "ev" || mode === "bus";
}

function AddressSearch({ label, value, onChange, placeholder }: AddressSearchProps) {
  const { resolvedTheme } = useStore();
  const styles = useMemo(() => makeStyles(colorsForTheme(resolvedTheme)), [resolvedTheme]);
  const [suggestions, setSuggestions] = useState<Place[]>([]);
  const [searching, setSearching] = useState(false);
  const [dismissedValue, setDismissedValue] = useState<string | null>(null);

  useEffect(() => {
    const query = value.trim();
    if (query.length < 3 || dismissedValue === value) {
      setSuggestions([]);
      setSearching(false);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const handle = setTimeout(async () => {
      try {
        const result = await api.searchPlaces(query);
        if (!cancelled) setSuggestions(result.places);
      } catch {
        if (!cancelled) setSuggestions([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 300);
    return () => { cancelled = true; clearTimeout(handle); };
  }, [value, dismissedValue]);

  function change(next: string) {
    setDismissedValue(null);
    onChange(next);
  }

  function choose(place: Place) {
    setDismissedValue(place.label);
    setSuggestions([]);
    onChange(place.label);
  }

  return (
    <View style={styles.addressSearch}>
      <Field label={label} value={value} onChangeText={change} placeholder={placeholder} autoCapitalize="words" autoComplete="street-address" />
      {searching ? <Text style={styles.searchStatus}>Searching…</Text> : null}
      {suggestions.length ? (
        <View style={styles.suggestions}>
          {suggestions.map((place, index) => (
            <Pressable key={`${place.lat}:${place.lng}:${place.label}`} onPress={() => choose(place)}
              style={({ pressed }) => [styles.suggestion, index > 0 && styles.suggestionBorder, pressed && styles.suggestionPressed]}>
              <Text style={styles.suggestionText} numberOfLines={2}>{place.label}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function isNoRoadError(err: unknown): boolean {
  return err instanceof Error && err.message.includes("No drivable route exists");
}

function shortLabel(label: string): string { return label.split(",")[0].trim(); }

export function LogTripScreen({ navigation }: Props) {
  const { saveTrip, defaultLoggingMethod, preferencesLoaded, measurementSystem, displayPrecision, resolvedTheme } = useStore();
  const colors = colorsForTheme(resolvedTheme);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [logMethod, setLogMethod] = useState<LogMethod>(defaultLoggingMethod);
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [mode, setMode] = useState<TransportMode>("car");
  const [roadStatus, setRoadStatus] = useState<RoadStatus>("idle");
  const [manualLegs, setManualLegs] = useState<ManualLegDraft[]>([{ origin: "", destination: "", mode: "car" }]);
  const [estimate, setEstimate] = useState<RouteEstimate | null>(null);
  const [estimating, setEstimating] = useState(false);
  const [estimateError, setEstimateError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => { if (preferencesLoaded) setLogMethod(defaultLoggingMethod); }, [preferencesLoaded, defaultLoggingMethod]);
  const bothEnds = origin.trim().length > 0 && destination.trim().length > 0;

  function switchMethod(next: LogMethod) {
    if (next === logMethod) return;
    setLogMethod(next);
    setEstimate(null);
    setEstimateError(null);
    setSaveError(null);
  }

  useEffect(() => {
    if (logMethod !== "automatic" || !bothEnds) { setRoadStatus("idle"); return; }
    let cancelled = false;
    setRoadStatus("checking");
    const handle = setTimeout(async () => {
      try {
        await api.estimate({ origin: origin.trim(), destination: destination.trim(), mode: "car" });
        if (!cancelled) setRoadStatus("available");
      } catch (err) {
        if (cancelled) return;
        if (isNoRoadError(err)) {
          setRoadStatus("unavailable");
          setMode((current) => (needsDrivingNetwork(current) ? "plane" : current));
          setEstimate((current) => (current && needsDrivingNetwork(current.mode) ? null : current));
        } else {
          setRoadStatus("idle");
        }
      }
    }, 650);
    return () => { cancelled = true; clearTimeout(handle); };
  }, [origin, destination, bothEnds, logMethod]);

  useEffect(() => {
    if (logMethod !== "automatic") return;
    if (!bothEnds) {
      setEstimate(null);
      setEstimateError(null);
      setEstimating(false);
      return;
    }
    if (needsDrivingNetwork(mode) && roadStatus === "unavailable") {
      setEstimate(null);
      setEstimateError("This mode needs a continuous road route between the selected locations.");
      setEstimating(false);
      return;
    }
    let cancelled = false;
    setEstimating(true);
    setEstimateError(null);
    const handle = setTimeout(async () => {
      try {
        const result = await api.estimate({ origin: origin.trim(), destination: destination.trim(), mode });
        if (!cancelled) setEstimate(result);
      } catch (err) {
        if (!cancelled) {
          setEstimate(null);
          setEstimateError(err instanceof Error ? err.message : "Could not calculate this route.");
        }
      } finally {
        if (!cancelled) setEstimating(false);
      }
    }, 700);
    return () => { cancelled = true; clearTimeout(handle); };
  }, [origin, destination, mode, bothEnds, roadStatus, logMethod]);

  const compare = useMemo(() => comparisonCopy(
    estimate?.mode ?? mode,
    estimate?.comparisonMode,
    estimate?.vsComparisonKg,
    measurementSystem,
    displayPrecision,
  ), [estimate, mode, measurementSystem, displayPrecision]);

  const ecoScore = estimate ? calculateEcoScore(estimate.factor.gPerKm, estimate.distanceKm) : null;

  function updateManualLeg(index: number, patch: Partial<ManualLegDraft>) {
    setEstimate(null);
    setEstimateError(null);
    setManualLegs((current) => {
      const next = current.map((leg) => ({ ...leg }));
      const oldDestination = next[index].destination;
      next[index] = { ...next[index], ...patch };
      if (patch.destination !== undefined && index + 1 < next.length && (!next[index + 1].origin.trim() || next[index + 1].origin === oldDestination)) {
        next[index + 1].origin = patch.destination;
      }
      return next;
    });
  }

  function addManualLeg() {
    setEstimate(null);
    setEstimateError(null);
    setManualLegs((current) => [...current, { origin: current[current.length - 1]?.destination ?? "", destination: "", mode: "car" }]);
  }

  function removeManualLeg(index: number) {
    setEstimate(null);
    setEstimateError(null);
    setManualLegs((current) => current.filter((_, i) => i !== index));
  }

  async function previewManual() {
    if (!manualLegs.length) return;
    const incomplete = manualLegs.findIndex((leg) => !leg.origin.trim() || !leg.destination.trim());
    if (incomplete >= 0) { setEstimateError(`Finish the origin and destination for leg ${incomplete + 1}.`); return; }
    setEstimating(true);
    setEstimate(null);
    setEstimateError(null);
    try {
      const routedLegs: RouteLeg[] = [];
      let totalDistanceKm = 0;
      let totalDurationMin = 0;
      let totalCo2eKg = 0;
      for (const draft of manualLegs) {
        const result = await api.estimate({ origin: draft.origin.trim(), destination: draft.destination.trim(), mode: draft.mode, direct: draft.mode === "plane" });
        routedLegs.push({
          mode: draft.mode,
          origin: result.origin,
          destination: result.destination,
          distanceKm: result.distanceKm,
          durationMin: result.durationMin,
          polyline: result.polyline,
          provider: result.provider,
          summary: `${modeLabel(draft.mode)} · ${shortLabel(result.origin.label)} → ${shortLabel(result.destination.label)}`,
        });
        totalDistanceKm += result.distanceKm;
        totalDurationMin += result.durationMin;
        totalCo2eKg += result.co2eKg;
      }
      const first = routedLegs[0];
      const last = routedLegs[routedLegs.length - 1];
      const sameMode = routedLegs.every((leg) => leg.mode === first.mode);
      const overallMode: TransportMode = sameMode ? first.mode : routedLegs.some((leg) => leg.mode === "plane") ? "plane" : "car";
      const effectiveFactor = totalDistanceKm > 0 ? (totalCo2eKg * 1000) / totalDistanceKm : 0;
      setEstimate({
        origin: first.origin,
        destination: last.destination,
        mode: overallMode,
        distanceKm: Math.round(totalDistanceKm * 1000) / 1000,
        durationMin: Math.round(totalDurationMin),
        polyline: routedLegs.flatMap((leg) => leg.polyline),
        legs: routedLegs,
        co2eKg: Math.round(totalCo2eKg * 1000) / 1000,
        factor: { mode: overallMode, gPerKm: Math.round(effectiveFactor * 1000) / 1000, source: "Manual itinerary · per-leg factors" },
        drivingCo2eKg: null,
        vsDrivingKg: null,
        provider: routedLegs.some((leg) => leg.mode === "plane") ? "haversine" : routedLegs[0].provider,
      });
    } catch (err) {
      setEstimateError(err instanceof Error ? err.message : "Could not preview this itinerary.");
    } finally {
      setEstimating(false);
    }
  }

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
        logMethod,
        distanceKm: estimate.distanceKm,
        durationMin: estimate.durationMin,
        co2eKg: estimate.co2eKg,
        polyline: estimate.polyline,
        legs: estimate.legs,
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
          <View style={styles.heroCopy}>
            <Heading>Compare your route</Heading>
            <Muted>See distance, time, carbon intensity, trip CO₂e, and an Eco-Score while keeping Luma's real road and flight routing.</Muted>
          </View>

          <View style={styles.card}>
            <Text style={styles.modeLabel}>Logging method</Text>
            <View style={styles.modes}>
              <Chip label="Automatic" selected={logMethod === "automatic"} onPress={() => switchMethod("automatic")} />
              <Chip label="Manual itinerary" selected={logMethod === "manual"} tone="muted" onPress={() => switchMethod("manual")} />
            </View>

            {logMethod === "automatic" ? (
              <>
                <AddressSearch label="Origin" value={origin} onChange={setOrigin} placeholder="17 Billings St, Pittsburgh, PA" />
                <AddressSearch label="Destination" value={destination} onChange={setDestination} placeholder="5000 Forbes Ave, Pittsburgh, PA" />
                <Text style={styles.modeLabel}>Your usual mode</Text>
                <View style={styles.modes}>
                  {MODES.map((m) => (
                    <Chip key={m} label={modeLabel(m)} selected={mode === m} tone={m}
                      disabled={needsDrivingNetwork(m) && roadStatus === "unavailable"} onPress={() => setMode(m)} />
                  ))}
                </View>
                {roadStatus === "checking" && bothEnds ? <Text style={styles.modeHint}>Checking the road network…</Text> : null}
                {roadStatus === "unavailable" ? <Text style={styles.modeUnavailable}>Road-based modes are unavailable for this pair.</Text> : null}
              </>
            ) : (
              <View style={styles.manualWrap}>
                {manualLegs.map((leg, index) => (
                  <View key={index} style={styles.legEditor}>
                    <View style={styles.legHeader}>
                      <Text style={styles.legHeading}>Leg {index + 1}</Text>
                      {manualLegs.length > 1 ? <Pressable onPress={() => removeManualLeg(index)}><Text style={styles.removeLeg}>Remove</Text></Pressable> : null}
                    </View>
                    <View style={styles.modes}>
                      {MODES.map((m) => <Chip key={m} label={modeLabel(m)} selected={leg.mode === m} tone={m} onPress={() => updateManualLeg(index, { mode: m })} />)}
                    </View>
                    <AddressSearch label="From" value={leg.origin} onChange={(value) => updateManualLeg(index, { origin: value })} placeholder={leg.mode === "plane" ? "JFK or John F. Kennedy Airport" : "Start address"} />
                    <AddressSearch label="To" value={leg.destination} onChange={(value) => updateManualLeg(index, { destination: value })} placeholder={leg.mode === "plane" ? "AVL or Asheville Regional Airport" : "Destination address"} />
                  </View>
                ))}
                <Button label="+ Add leg" variant="ghost" onPress={addManualLeg} />
                <Button label={estimating ? "Building itinerary…" : "Preview manual itinerary"} onPress={() => void previewManual()} disabled={estimating} />
              </View>
            )}

            {estimating && !estimate ? <View style={styles.hold}><ActivityIndicator color={colors.accent} /><Text style={styles.holdBody}>Calculating route and emissions…</Text></View> : null}
            {estimateError ? <Text style={styles.error}>{estimateError}</Text> : null}
          </View>

          {estimate ? (
            <>
              <View style={styles.scoreCard}>
                <View style={styles.scoreRow}>
                  <Text style={styles.scoreLabel}>Selected Eco-Score</Text>
                  <Text style={styles.scoreValue}>{ecoScore}<Text style={styles.scoreOutOf}> / 100</Text></Text>
                </View>
                <View style={styles.scoreTrack}><View style={[styles.scoreMeter, { width: `${ecoScore ?? 0}%` }]} /></View>
                <View style={styles.scoreStats}>
                  <View style={styles.scoreStat}><Text style={styles.scoreStatLabel}>Distance</Text><Text style={styles.scoreStatValue}>{formatKm(estimate.distanceKm, measurementSystem, displayPrecision)}</Text></View>
                  <View style={styles.scoreStat}><Text style={styles.scoreStatLabel}>Duration</Text><Text style={styles.scoreStatValue}>{formatDuration(estimate.durationMin)}</Text></View>
                  <View style={styles.scoreStat}><Text style={styles.scoreStatLabel}>Intensity</Text><Text style={styles.scoreStatValue}>{formatFactor(estimate.factor.gPerKm, measurementSystem, displayPrecision)}</Text></View>
                  <View style={styles.scoreStat}><Text style={styles.scoreStatLabel}>Trip CO₂e</Text><Text style={styles.scoreStatValue}>{formatKg(estimate.co2eKg, measurementSystem, displayPrecision)}</Text></View>
                </View>
              </View>

              <MapPreview estimate={estimate} />
              <View style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>{modeLabel(estimate.mode)}</Text>
                <Text style={styles.summaryBody}>{estimate.factor.source} · {estimate.provider}</Text>
                {compare && logMethod === "automatic" ? <Text style={styles.compare}>{compare}</Text> : null}
              </View>
            </>
          ) : null}

          {saveError ? <Text style={styles.error}>{saveError}</Text> : null}
          <Button label={saving ? "Saving…" : logMethod === "manual" ? "Save itinerary" : "Save trip"} onPress={() => void onSave()} disabled={!estimate || saving} />
          <Button label="Cancel" variant="ghost" onPress={() => navigation.goBack()} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function makeStyles(colors: ThemeColors) {
  const shadow = shadowFor(colors);
  return StyleSheet.create({
    flex: { flex: 1 },
    wrap: { padding: space.lg, paddingTop: space.xl, maxWidth: 680, width: "100%", alignSelf: "center", gap: space.lg, paddingBottom: 48 },
    heroCopy: { gap: 6 },
    card: { gap: space.md, padding: space.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.card, ...shadow.hard },
    addressSearch: { gap: 4, position: "relative", zIndex: 10 },
    searchStatus: { fontFamily: font.body, fontSize: 12, color: colors.muted, paddingHorizontal: 2 },
    suggestions: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 9, overflow: "hidden" },
    suggestion: { paddingHorizontal: space.md, paddingVertical: 11, backgroundColor: colors.surface },
    suggestionBorder: { borderTopWidth: 1, borderTopColor: colors.line },
    suggestionPressed: { backgroundColor: colors.surfaceMuted },
    suggestionText: { fontFamily: font.body, fontSize: 14, lineHeight: 19, color: colors.ink },
    modeLabel: { fontFamily: font.bodyMed, fontSize: 12, color: colors.muted, textTransform: "uppercase", letterSpacing: 0.6 },
    modes: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
    modeHint: { fontFamily: font.body, fontSize: 12, color: colors.muted },
    modeUnavailable: { fontFamily: font.bodyMed, fontSize: 12, color: colors.danger },
    manualWrap: { gap: space.md },
    legEditor: { gap: space.sm, padding: space.md, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.line, borderRadius: 12 },
    legHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    legHeading: { fontFamily: font.display, fontSize: 18, color: colors.ink },
    removeLeg: { fontFamily: font.bodyMed, fontSize: 13, color: colors.danger },
    hold: { backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.line, borderRadius: 12, padding: space.lg, gap: space.sm, alignItems: "center" },
    holdBody: { fontFamily: font.body, fontSize: 14, lineHeight: 21, color: colors.muted },
    error: { fontFamily: font.body, fontSize: 14, color: colors.danger },
    scoreCard: { padding: space.lg, borderRadius: radius.card, backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.line, gap: space.md },
    scoreRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", gap: space.md },
    scoreLabel: { fontFamily: font.bodyBold, fontSize: 15, color: colors.accent },
    scoreValue: { fontFamily: font.display, fontSize: 30, color: colors.accentText },
    scoreOutOf: { fontFamily: font.bodyMed, fontSize: 13, color: colors.accent },
    scoreTrack: { height: 8, borderRadius: 999, overflow: "hidden", backgroundColor: colors.accentSoft },
    scoreMeter: { height: "100%", borderRadius: 999, backgroundColor: colors.accent },
    scoreStats: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
    scoreStat: { width: "48%", flexGrow: 1, minWidth: 140, paddingVertical: 4, gap: 2 },
    scoreStatLabel: { fontFamily: font.body, fontSize: 12, color: colors.accent },
    scoreStatValue: { fontFamily: font.bodyBold, fontSize: 14, color: colors.accentText },
    summaryCard: { padding: space.md, borderWidth: 1, borderColor: colors.line, borderRadius: radius.card, backgroundColor: colors.surface, gap: 4 },
    summaryTitle: { fontFamily: font.bodyBold, fontSize: 15, color: colors.ink },
    summaryBody: { fontFamily: font.body, fontSize: 12, color: colors.muted },
    compare: { fontFamily: font.bodyMed, fontSize: 14, color: colors.accentText, marginTop: 4 },
  });
}
