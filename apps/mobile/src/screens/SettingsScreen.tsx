import type { ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useStore, type RecentTripsPreference } from "../store";
import { colorsForTheme, radius, space, type as font, type ThemeColors, type ThemePreference } from "../theme";
import { Heading, Muted, Screen } from "../ui";

export function SettingsScreen() {
  const {
    resolvedTheme,
    measurementSystem,
    setMeasurementSystem,
    defaultLoggingMethod,
    setDefaultLoggingMethod,
    themePreference,
    setThemePreference,
    displayPrecision,
    setDisplayPrecision,
    showDrivingComparison,
    setShowDrivingComparison,
    recentTrips,
    setRecentTrips,
  } = useStore();
  const styles = makeStyles(colorsForTheme(resolvedTheme));

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.wrap}>
        <Heading>Settings</Heading>
        <Muted>Choose how Luma behaves and how trip information is displayed.</Muted>

        <PreferenceSection label="Units">
          <Option title="Metric" detail="Kilometers · kilograms CO₂e" selected={measurementSystem === "metric"} onPress={() => void setMeasurementSystem("metric")} styles={styles} />
          <Option title="Imperial" detail="Miles · pounds CO₂e" selected={measurementSystem === "imperial"} onPress={() => void setMeasurementSystem("imperial")} styles={styles} />
        </PreferenceSection>

        <PreferenceSection label="Trip defaults">
          <Option title="Automatic logging" detail="Luma builds the itinerary" selected={defaultLoggingMethod === "automatic"} onPress={() => void setDefaultLoggingMethod("automatic")} styles={styles} />
          <Option title="Manual itinerary" detail="Start new trips in manual mode" selected={defaultLoggingMethod === "manual"} onPress={() => void setDefaultLoggingMethod("manual")} styles={styles} />
        </PreferenceSection>

        <PreferenceSection label="Appearance">
          {(["system", "light", "dark"] as ThemePreference[]).map((value) => (
            <Option
              key={value}
              title={value === "system" ? "System" : value === "light" ? "Light" : "Dark"}
              detail={value === "system" ? "Follow your device appearance" : `Always use ${value} mode`}
              selected={themePreference === value}
              onPress={() => void setThemePreference(value)}
              styles={styles}
            />
          ))}
        </PreferenceSection>

        <PreferenceSection label="Display precision">
          <Option title="Simple" detail="Cleaner rounded values" selected={displayPrecision === "simple"} onPress={() => void setDisplayPrecision("simple")} styles={styles} />
          <Option title="Detailed" detail="Show extra decimal precision" selected={displayPrecision === "detailed"} onPress={() => void setDisplayPrecision("detailed")} styles={styles} />
        </PreferenceSection>

        <PreferenceSection label="Trip information">
          <Option title="Show driving comparison" detail="Show more/less CO₂e than driving" selected={showDrivingComparison} onPress={() => void setShowDrivingComparison(true)} styles={styles} />
          <Option title="Hide driving comparison" detail="Only show the trip estimate" selected={!showDrivingComparison} onPress={() => void setShowDrivingComparison(false)} styles={styles} />
        </PreferenceSection>

        <PreferenceSection label="Recent trips">
          {([5, 10, 25, "all"] as RecentTripsPreference[]).map((value) => (
            <Option
              key={String(value)}
              title={value === "all" ? "All" : String(value)}
              detail={value === "all" ? "Show every loaded trip on Home" : `Show the latest ${value} trips on Home`}
              selected={recentTrips === value}
              onPress={() => void setRecentTrips(value)}
              styles={styles}
            />
          ))}
        </PreferenceSection>

        <Text style={styles.note}>These preferences are saved on this device. Unit and precision changes only affect display; stored route and emissions data stays unchanged.</Text>
      </ScrollView>
    </Screen>
  );
}

function PreferenceSection({ label, children }: { label: string; children: ReactNode }) {
  const { resolvedTheme } = useStore();
  const styles = makeStyles(colorsForTheme(resolvedTheme));
  return <View style={styles.section}><Text style={styles.label}>{label}</Text>{children}</View>;
}

function Option({ title, detail, selected, onPress, styles }: { title: string; detail: string; selected: boolean; onPress: () => void; styles: ReturnType<typeof makeStyles> }) {
  return (
    <Pressable accessibilityRole="radio" accessibilityState={{ checked: selected }} onPress={onPress} style={({ pressed }) => [styles.option, selected && styles.optionSelected, pressed && styles.optionPressed]}>
      <View style={[styles.radio, selected && styles.radioSelected]}>{selected ? <View style={styles.radioDot} /> : null}</View>
      <View style={styles.optionCopy}><Text style={styles.optionTitle}>{title}</Text><Text style={styles.optionDetail}>{detail}</Text></View>
    </Pressable>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrap: { padding: space.lg, paddingTop: space.xl, paddingBottom: 48, maxWidth: 620, width: "100%", alignSelf: "center", gap: space.xl },
    section: { gap: space.sm },
    label: { fontFamily: font.bodyMed, fontSize: 13, color: colors.muted, textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 2 },
    option: { flexDirection: "row", alignItems: "center", gap: space.md, padding: space.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.card },
    optionSelected: { borderColor: colors.accent, backgroundColor: colors.accentSoft }, optionPressed: { opacity: 0.82 },
    radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.line, alignItems: "center", justifyContent: "center" },
    radioSelected: { borderColor: colors.accent }, radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.accent },
    optionCopy: { flex: 1, gap: 3 }, optionTitle: { fontFamily: font.bodyMed, fontSize: 16, color: colors.ink }, optionDetail: { fontFamily: font.body, fontSize: 13, color: colors.muted },
    note: { fontFamily: font.body, fontSize: 13, lineHeight: 20, color: colors.muted },
  });
}
