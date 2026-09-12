import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation";
import type { RouteEstimate } from "@carbonroute/shared";
import { colorsForTheme, space, type as font, type ThemeColors } from "../theme";
import { Button, Heading, Muted, Screen } from "../ui";
import { MapPreview } from "../components/MapPreview";
import { formatKg, modeLabel, placeDisplayLabel } from "../format";
import { useStore } from "../store";

type Props = NativeStackScreenProps<RootStackParamList, "Results">;

export function ResultsScreen({ navigation, route }: Props) {
  const { measurementSystem, displayPrecision, resolvedTheme } = useStore();
  const colors = colorsForTheme(resolvedTheme);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { trip } = route.params;
  const estimate: RouteEstimate = {
    origin: { label: trip.originLabel, lat: trip.originLat, lng: trip.originLng },
    destination: { label: trip.destinationLabel, lat: trip.destLat, lng: trip.destLng },
    mode: trip.mode,
    distanceKm: trip.distanceKm,
    durationMin: trip.durationMin,
    polyline: trip.polyline,
    legs: trip.legs,
    co2eKg: trip.co2eKg,
    factor: { mode: trip.mode, gPerKm: trip.factorGPerKm, source: trip.factorSource },
    drivingCo2eKg: null,
    vsDrivingKg: null,
    provider: trip.legs?.some((leg) => leg.mode === "plane") ? "haversine" : "osrm",
  };

  return (
    <Screen>
      <View style={styles.wrap}>
        <Text style={styles.kicker}>{trip.pending ? "Queued on device" : "On the ledger"}</Text>
        <Heading>{trip.logMethod === "manual" ? "Itinerary logged" : "Trip logged"}</Heading>
        <Muted>{trip.logMethod === "manual" ? "Manual itinerary" : modeLabel(trip.mode)} from {placeDisplayLabel(trip.originLabel)} to {placeDisplayLabel(trip.destinationLabel)}.</Muted>

        <View style={styles.hero}>
          <Text style={styles.heroValue}>{formatKg(trip.co2eKg, measurementSystem, displayPrecision)}</Text>
          <Text style={styles.heroLabel}>CO₂e · {trip.factorSource}</Text>
        </View>

        {trip.pending ? <Text style={styles.note}>Saved in the offline queue. Home will pick it up, and it will POST to the API when you are back online.</Text> : null}
        <MapPreview estimate={estimate} />
        <Button label="Back to home" onPress={() => navigation.navigate("Home")} />
        <Button label="Open trip" variant="ghost" onPress={() => navigation.replace("TripDetail", { trip })} />
      </View>
    </Screen>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrap: { padding: space.lg, paddingTop: space.xl, maxWidth: 520, width: "100%", alignSelf: "center", gap: space.md, flex: 1 },
    kicker: { fontFamily: font.bodyMed, fontSize: 12, letterSpacing: 0.8, textTransform: "uppercase", color: colors.accentText },
    hero: { backgroundColor: colors.accentSoft, borderWidth: 1, borderColor: colors.line, padding: space.lg, gap: 4 },
    heroValue: { fontFamily: font.display, fontSize: 36, color: colors.accentText },
    heroLabel: { fontFamily: font.body, fontSize: 13, color: colors.accentText },
    note: { fontFamily: font.body, fontSize: 14, color: colors.muted, lineHeight: 20 },
  });
}
