import { Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, radius, space, type as font } from "../theme";
import { Heading, Muted, Screen } from "../ui";

const creditsArt = require("../../../../3.png");

export function CreditsScreen() {
  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.wrap}>
        <Heading>Credits</Heading>
        <Muted>Luma is built from a mix of open mapping, routing, airport, and app-development tools.</Muted>

        <View style={styles.artCard}>
          <Image source={creditsArt} style={styles.art} resizeMode="contain" />
        </View>

        <View style={styles.card}>
          <Credit title="Maps & geocoding" body="OpenStreetMap data, Nominatim search, and Leaflet map rendering." />
          <Credit title="Road routing" body="OSRM, with optional Mapbox, Google Maps, and openrouteservice routing providers." />
          <Credit title="Airport network" body="OpenFlights airport and route snapshots power airport lookup and connection planning." />
          <Credit title="App platform" body="Expo, React Native, React Navigation, PostgreSQL, and the Luma team." />
        </View>
      </ScrollView>
    </Screen>
  );
}

function Credit({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.credit}>
      <Text style={styles.creditTitle}>{title}</Text>
      <Text style={styles.creditBody}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    padding: space.lg,
    paddingTop: space.xl,
    paddingBottom: 48,
    maxWidth: 620,
    width: "100%",
    alignSelf: "center",
    gap: space.lg,
  },
  artCard: {
    minHeight: 300,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.card,
    overflow: "hidden",
    backgroundColor: colors.surface,
    padding: space.sm,
  },
  art: {
    width: "100%",
    height: 420,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.card,
    padding: space.lg,
    gap: space.lg,
  },
  credit: { gap: 5 },
  creditTitle: {
    fontFamily: font.bodyMed,
    fontSize: 15,
    color: colors.ink,
  },
  creditBody: {
    fontFamily: font.body,
    fontSize: 14,
    lineHeight: 21,
    color: colors.muted,
  },
});
