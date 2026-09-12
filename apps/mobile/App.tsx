import { useFonts, Fraunces_600SemiBold, Fraunces_600SemiBold_Italic } from "@expo-google-fonts/fraunces";
import {
  IBMPlexSans_400Regular,
  IBMPlexSans_500Medium,
  IBMPlexSans_600SemiBold,
} from "@expo-google-fonts/ibm-plex-sans";
import { NavigationContainer, DefaultTheme, DarkTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import type { RootStackParamList } from "./src/navigation";
import { StoreProvider, useStore } from "./src/store";
import { HomeScreen } from "./src/screens/HomeScreen";
import { LogTripScreen } from "./src/screens/LogTripScreen";
import { ResultsScreen } from "./src/screens/ResultsScreen";
import { TripDetailScreen } from "./src/screens/TripDetailScreen";
import { AboutScreen } from "./src/screens/AboutScreen";
import { CreditsScreen } from "./src/screens/CreditsScreen";
import { SettingsScreen } from "./src/screens/SettingsScreen";
import { LumaMenuButton } from "./src/components/LumaMenu";
import { colorsForTheme, lightColors, type as font } from "./src/theme";

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const [loaded] = useFonts({
    Fraunces_600SemiBold,
    Fraunces_600SemiBold_Italic,
    IBMPlexSans_400Regular,
    IBMPlexSans_500Medium,
    IBMPlexSans_600SemiBold,
  });

  if (!loaded) {
    return (
      <View style={[styles.boot, { backgroundColor: lightColors.bg }]}>
        <ActivityIndicator color={lightColors.accent} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StoreProvider>
        <AppShell />
      </StoreProvider>
    </SafeAreaProvider>
  );
}

function AppShell() {
  const { resolvedTheme } = useStore();
  const colors = colorsForTheme(resolvedTheme);
  const baseTheme = resolvedTheme === "dark" ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
      background: colors.bg,
      card: colors.bg,
      text: colors.ink,
      border: colors.line,
      primary: colors.accent,
      notification: colors.accent,
    },
  };

  return (
    <NavigationContainer theme={navTheme}>
      <StatusBar style={resolvedTheme === "dark" ? "light" : "dark"} />
      <Stack.Navigator
        screenOptions={({ navigation }) => ({
          headerShadowVisible: false,
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.ink,
          headerTitleStyle: { fontFamily: font.bodyMed, fontSize: 16, color: colors.ink },
          contentStyle: { backgroundColor: colors.bg },
          headerBackVisible: false,
          headerLeft: ({ canGoBack }) => (
            <View style={styles.headerLeft}>
              <LumaMenuButton />
              {canGoBack ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Back"
                  onPress={() => navigation.goBack()}
                  style={({ pressed }) => [styles.back, pressed && styles.backPressed]}
                >
                  <Text style={[styles.backText, { color: colors.ink }]}>‹</Text>
                </Pressable>
              ) : null}
            </View>
          ),
        })}
      >
        <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
        <Stack.Screen name="LogTrip" component={LogTripScreen} options={{ title: "Log trip" }} />
        <Stack.Screen name="Results" component={ResultsScreen} options={{ title: "Results" }} />
        <Stack.Screen name="TripDetail" component={TripDetailScreen} options={{ title: "Trip" }} />
        <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: "Settings" }} />
        <Stack.Screen name="About" component={AboutScreen} options={{ title: "About Luma" }} />
        <Stack.Screen name="Credits" component={CreditsScreen} options={{ title: "Credits" }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  boot: { flex: 1, alignItems: "center", justifyContent: "center" },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  back: { width: 34, height: 40, alignItems: "center", justifyContent: "center" },
  backPressed: { opacity: 0.55 },
  backText: { fontFamily: font.bodyMed, fontSize: 34, lineHeight: 36 },
});
