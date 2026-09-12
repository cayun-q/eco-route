import { ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation";
import type { RouteEstimate } from "@carbonroute/shared";
import { colors, space, type as font } from "../theme";
import { Button, Heading, Muted, Screen } from "../ui";
import { MapPreview } from "../components/MapPreview";
import { formatDate, formatDuration, formatKg, formatKm, modeLabel, placeDisplayLabel } from "../format";

type Props = NativeStackScreenProps<RootStackParamList, "TripDetail">;

export function TripDetailScreen({ navigation, route }: Props) {
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
      <ScrollView contentContainerStyle={styles.wrap}>
        <Heading>
          {placeDisplayLabel(trip.originLabel)} → {placeDisplayLabel(trip.destinationLabel)}
        </Heading>
        <Muted>
          {trip.logMethod === "manual" ? "Manual itinerary" : modeLabel(trip.mode)} · {formatDate(trip.createdAt)}
          {trip.pending ? " · queued" : ""}
        </Muted>

        <MapPreview estimate={estimate} />

        <View style={styles.rows}>
          <Row k="Logging" v={trip.logMethod === "manual" ? "Manual itinerary" : "Automatic"} />
          <Row k="Distance" v={formatKm(trip.distanceKm)} />
          <Row k="Duration" v={formatDuration(trip.durationMin)} />
          <Row k="CO₂e" v={formatKg(trip.co2eKg)} />
          <Row k="Factor" v={`${trip.factorGPerKm} g/km`} />
          <Row k="Source" v={trip.factorSource} />
        </View>

        <Button label="Log another trip" onPress={() => navigation.navigate("LogTrip")} />
        <Button label="Home" variant="ghost" onPress={() => navigation.navigate("Home")} />
      </ScrollView>
    </Screen>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.k}>{k}</Text>
      <Text style={styles.v}>{v}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    padding: space.lg,
    paddingTop: space.xl,
    maxWidth: 520,
    width: "100%",
    alignSelf: "center",
    gap: space.md,
    paddingBottom: 48,
  },
  rows: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: space.md,
    paddingHorizontal: space.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  k: {
    fontFamily: font.body,
    fontSize: 14,
    color: colors.muted,
  },
  v: {
    fontFamily: font.bodyMed,
    fontSize: 14,
    color: colors.ink,
    flexShrink: 1,
    textAlign: "right",
  },
});
