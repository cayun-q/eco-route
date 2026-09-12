import { useMemo } from "react";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { useStore } from "../store";
import { colorsForTheme, radius, space, type as font, type ThemeColors } from "../theme";
import { Heading, Muted, Screen } from "../ui";

const creditsArt = require("../../../../3.png");
const logo = require("../../../../1.png");

const TEAM = [
  { name: "Sri Lekkala", role: "Design and Carbon Modeling Lead" },
  { name: "Sue Lei", role: "Data Collection Analyst" },
  { name: "Izzy Donica", role: "Data Collection Analyst" },
  { name: "Zachary Price", role: "Web Architecture Lead" },
] as const;

export function CreditsScreen() {
  const { resolvedTheme } = useStore();
  const styles = useMemo(() => makeStyles(colorsForTheme(resolvedTheme)), [resolvedTheme]);
  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.wrap}>
        <View style={styles.headingRow}>
          <View style={styles.logoShell}><Image source={logo} style={styles.logo} resizeMode="cover" /></View>
          <View style={styles.headingCopy}>
            <Heading>Credits</Heading>
            <Muted>Luma is built by a small team using open mapping, routing, airport, emissions, and app-development tools.</Muted>
          </View>
        </View>

        <View style={styles.wordmarkFrame}><Image source={creditsArt} style={styles.wordmark} resizeMode="cover" /></View>

        <View style={styles.teamSection}>
          <View style={styles.sectionHeading}>
            <Text style={styles.sectionTitle}>Meet the team</Text>
            <Text style={styles.sectionBody}>The people behind Luma's design, data, carbon modeling, and web architecture.</Text>
          </View>
          <View style={styles.teamGrid}>
            {TEAM.map((member) => (
              <View key={member.name} style={styles.teamCard}>
                <Text style={styles.memberName}>{member.name}</Text>
                <Text style={styles.memberRole}>{member.role}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <Credit title="Maps & geocoding" body="OpenStreetMap data, Nominatim search, and Leaflet map rendering." styles={styles} />
          <Credit title="Road routing" body="OSRM, with optional Mapbox, Google Maps, and openrouteservice routing providers." styles={styles} />
          <Credit title="Airport network" body="OpenFlights airport and route snapshots power airport lookup and connection planning." styles={styles} />
          <Credit title="App platform" body="Expo, React Native, React Navigation, PostgreSQL, and the Luma team." styles={styles} />
        </View>
      </ScrollView>
    </Screen>
  );
}

function Credit({ title, body, styles }: { title: string; body: string; styles: ReturnType<typeof makeStyles> }) {
  return <View style={styles.credit}><Text style={styles.creditTitle}>{title}</Text><Text style={styles.creditBody}>{body}</Text></View>;
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrap: { padding: space.lg, paddingTop: space.xl, paddingBottom: 48, maxWidth: 620, width: "100%", alignSelf: "center", gap: space.lg },
    headingRow: { flexDirection: "row", alignItems: "center", gap: space.md }, headingCopy: { flex: 1, gap: 4 },
    logoShell: { width: 70, height: 70, borderRadius: radius.card, overflow: "hidden", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
    logo: { width: "100%", height: "100%" },
    wordmarkFrame: { height: 118, width: "100%", overflow: "hidden", borderRadius: radius.card, backgroundColor: colors.bg },
    wordmark: { width: "100%", height: "100%", transform: [{ scale: 1.18 }] },
    teamSection: { gap: space.md },
    sectionHeading: { gap: 4 },
    sectionTitle: { fontFamily: font.display, fontSize: 22, color: colors.ink },
    sectionBody: { fontFamily: font.body, fontSize: 14, lineHeight: 21, color: colors.muted },
    teamGrid: { gap: space.sm },
    teamCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.card, padding: space.lg, gap: 4 },
    memberName: { fontFamily: font.bodyBold, fontSize: 16, color: colors.ink },
    memberRole: { fontFamily: font.body, fontSize: 14, lineHeight: 20, color: colors.accentText },
    card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.card, padding: space.lg, gap: space.lg },
    credit: { gap: 5 }, creditTitle: { fontFamily: font.bodyMed, fontSize: 15, color: colors.accentText },
    creditBody: { fontFamily: font.body, fontSize: 14, lineHeight: 21, color: colors.muted },
  });
}
