import { Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, radius, space, type as font } from "../theme";
import { Heading, Muted, Screen } from "../ui";

const aboutArt = require("../../../../2.png");

export function AboutScreen() {
  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.wrap}>
        <Heading>About Luma</Heading>
        <Muted>Plan a trip, understand its passenger carbon footprint, and keep a simple ledger of the journeys you take.</Muted>

        <View style={styles.wordmarkFrame}>
          <Image source={aboutArt} style={styles.wordmark} resizeMode="cover" />
        </View>

        <View style={styles.copyCard}>
          <Text style={styles.title}>Travel carbon, made visible.</Text>
          <Text style={styles.body}>
            Luma compares real road routing with flight itineraries and turns each route into an estimated CO₂e total. Automatic mode can build an itinerary for you, while Manual mode lets you enter the trip you already have planned.
          </Text>
          <Text style={styles.body}>
            The goal is not to tell you where you can or cannot go. It is to make the environmental cost of a trip easier to see before or after you travel.
          </Text>
        </View>
      </ScrollView>
    </Screen>
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
  wordmarkFrame: {
    height: 118,
    width: "100%",
    overflow: "hidden",
    borderRadius: radius.card,
    backgroundColor: colors.bg,
  },
  wordmark: {
    width: "100%",
    height: "100%",
    transform: [{ scale: 1.18 }],
  },
  copyCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.card,
    padding: space.lg,
    gap: space.md,
  },
  title: {
    fontFamily: font.display,
    fontSize: 22,
    color: colors.accentText,
  },
  body: {
    fontFamily: font.body,
    fontSize: 15,
    lineHeight: 23,
    color: colors.ink,
  },
});
