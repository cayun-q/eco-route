import { useFonts, Fraunces_600SemiBold, Fraunces_600SemiBold_Italic } from "@expo-google-fonts/fraunces";
import {
  IBMPlexSans_400Regular,
  IBMPlexSans_500Medium,
  IBMPlexSans_600SemiBold,
} from "@expo-google-fonts/ibm-plex-sans";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import type { RootStackParamList } from "./src/navigation";
import { StoreProvider } from "./src/store";
import { HomeScreen } from "./src/screens/HomeScreen";
import { LogTripScreen } from "./src/screens/LogTripScreen";
import { ResultsScreen } from "./src/screens/ResultsScreen";
import { TripDetailScreen } from "./src/screens/TripDetailScreen";
import { AboutScreen } from "./src/screens/AboutScreen";
import { CreditsScreen } from "./src/screens/CreditsScreen";
import { LumaMenuButton } from "./src/components/LumaMenu";
import { colors, type as font } from "./src/theme";

const Stack = createNativeStackNavigator<RootStackParamList>();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.bg,
    card: colors.bg,
    text: colors.ink,
    border: colors.line,
    primary: colors.accent,
  },
};

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
      <View style={styles.boot}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StoreProvider>
        <NavigationContainer theme={navTheme}>
          <StatusBar style="dark" />
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
                      <Text style={styles.backText}>‹</Text>
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
            <Stack.Screen name="About" component={AboutScreen} options={{ title: "About Luma" }} />
            <Stack.Screen name="Credits" component={CreditsScreen} options={{ title: "Credits" }} />
          </Stack.Navigator>
        </NavigationContainer>
      </StoreProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  back: {
    width: 34,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  backPressed: { opacity: 0.55 },
  backText: {
    fontFamily: font.bodyMed,
    fontSize: 34,
    lineHeight: 36,
    color: colors.ink,
  },
});
