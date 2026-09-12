import {
  useFonts,
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_600SemiBold_Italic,
} from "@expo-google-fonts/dm-sans";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import type { RootStackParamList } from "./src/navigation";
import { StoreProvider } from "./src/store";
import { HomeScreen } from "./src/screens/HomeScreen";
import { LogTripScreen } from "./src/screens/LogTripScreen";
import { ResultsScreen } from "./src/screens/ResultsScreen";
import { TripDetailScreen } from "./src/screens/TripDetailScreen";
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
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_600SemiBold_Italic,
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
            screenOptions={{
              headerShadowVisible: false,
              headerStyle: { backgroundColor: colors.bg },
              headerTintColor: colors.ink,
              headerTitleStyle: { fontFamily: font.bodyMed, fontSize: 16, color: colors.ink },
              contentStyle: { backgroundColor: colors.bg },
              headerBackTitle: "Back",
            }}
          >
            <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
            <Stack.Screen name="LogTrip" component={LogTripScreen} options={{ title: "Log trip" }} />
            <Stack.Screen name="Results" component={ResultsScreen} options={{ title: "Results" }} />
            <Stack.Screen name="TripDetail" component={TripDetailScreen} options={{ title: "Trip" }} />
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
});
