import { useMemo } from "react";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { useStore } from "../store";
import { colorsForTheme, radius, space, type as font, type ThemeColors } from "../theme";
import { Heading, Muted, Screen } from "../ui";

const aboutArt = require("../../../../2.png");

export function AboutScreen() {
  const { resolvedTheme } = useStore();
  const styles = useMemo(() => makeStyles(colorsForTheme(resolvedTheme)), [resolvedTheme]);
  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.wrap}>
        <Heading>About Luma</Heading>
        <Muted>Compare ways to make the same trip and find lower-impact alternatives before you decide how to travel.</Muted>
        <View style={styles.wordmarkFrame}><Image source={aboutArt} style={styles.wordmark} resizeMode="cover" /></View>
        <View style={styles.copyCard}>
          <Text style={styles.title}>Find a better way to get there.</Text>
          <Text style={styles.body}>Luma evaluates multiple transportation options for the same origin and destination, estimates the passenger CO₂e for each route, and brings the most practical alternatives together in one comparison.</Text>
          <Text style={styles.body}>Instead of looking at carbon in isolation, Luma also considers trip distance and how each option performs relative to the other realistic choices available for that journey. The Eco-Score is designed to make those tradeoffs easier to understand at a glance.</Text>
          <Text style={styles.body}>Road routes stay tied to real map geometry, flight options use airport and route-network data, and the map lets you see the route behind the estimate. Luma does not choose for you; it gives you clearer information about which realistic alternative may reduce the carbon impact of your trip.</Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrap: { padding: space.lg, paddingTop: space.xl, paddingBottom: 48, maxWidth: 620, width: "100%", alignSelf: "center", gap: space.lg },
    wordmarkFrame: { height: 118, width: "100%", overflow: "hidden", borderRadius: radius.card, backgroundColor: colors.bg },
    wordmark: { width: "100%", height: "100%", transform: [{ scale: 1.18 }] },
    copyCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.card, padding: space.lg, gap: space.md },
    title: { fontFamily: font.display, fontSize: 22, color: colors.accentText },
    body: { fontFamily: font.body, fontSize: 15, lineHeight: 23, color: colors.ink },
  });
}
