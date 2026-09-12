import { StatusBar } from "expo-status-bar";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { AppProvider, useApp } from "./src/context/AppContext";
import { HomeScreen } from "./src/screens/HomeScreen";
import { LogTripScreen } from "./src/screens/LogTripScreen";
import { TripDetailScreen } from "./src/screens/TripDetailScreen";
import { colors } from "./src/theme";

function Shell() {
  const { screen, go } = useApp();

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.brand}>
        <View style={styles.mark}>
          <Text style={styles.markText}>C</Text>
        </View>
        <View>
          <Text style={styles.brandName}>CarbonRoute</Text>
          <Text style={styles.brandTag}>Travel emissions, from a live factor table</Text>
        </View>
      </View>

      <View style={styles.screen}>
        {screen.name === "home" ? <HomeScreen /> : null}
        {screen.name === "log" ? <LogTripScreen /> : null}
        {screen.name === "detail" ? <TripDetailScreen tripId={screen.tripId} /> : null}
      </View>

      <View style={styles.tabs}>
        <Tab
          label="Home"
          active={screen.name === "home"}
          onPress={() => go({ name: "home" })}
        />
        <Tab
          label="Log trip"
          active={screen.name === "log"}
          onPress={() => go({ name: "log" })}
        />
      </View>
    </SafeAreaView>
  );
}

function Tab({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.tab, active && styles.tabActive]}>
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
    </Pressable>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <View style={styles.root}>
        <View style={styles.phone}>
          <AppProvider>
            <Shell />
          </AppProvider>
        </View>
        <StatusBar style="dark" />
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Platform.OS === "web" ? "#0F1A14" : colors.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  phone: {
    flex: 1,
    width: "100%",
    maxWidth: Platform.OS === "web" ? 430 : undefined,
    backgroundColor: colors.bg,
    overflow: "hidden",
    ...(Platform.OS === "web"
      ? {
          maxHeight: 900,
          marginVertical: 24,
          borderRadius: 28,
          borderWidth: 1,
          borderColor: "#1F3328",
          boxShadow: "0 24px 80px rgba(0,0,0,0.35)",
        }
      : {}),
  },
  safe: { flex: 1, backgroundColor: colors.bg },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  mark: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  markText: { color: colors.white, fontWeight: "800" },
  brandName: { color: colors.ink, fontWeight: "800", fontSize: 16 },
  brandTag: { color: colors.muted, fontSize: 11 },
  screen: { flex: 1 },
  tabs: {
    flexDirection: "row",
    gap: 8,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.surface,
  },
  tab: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  tabActive: { backgroundColor: colors.accentSoft },
  tabLabel: { color: colors.muted, fontWeight: "700" },
  tabLabelActive: { color: colors.accentText },
});
