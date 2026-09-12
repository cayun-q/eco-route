import { useCallback } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation";
import { useStore } from "../store";
import { colors, space, type as font } from "../theme";
import { Button, EmptyState, Heading, Muted, Screen } from "../ui";
import { TripCard } from "../components/TripCard";
import { formatKg } from "../format";

type Props = NativeStackScreenProps<RootStackParamList, "Home">;

export function HomeScreen({ navigation }: Props) {
  const { trips, stats, loading, error, online, refresh } = useStore();
  const insets = useSafeAreaInsets();

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={[styles.wrap, { paddingTop: Math.max(insets.top, 24) }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.masthead}>
          <Text style={styles.mark}>CR</Text>
          <View style={styles.mastText}>
            <Heading>CarbonRoute</Heading>
            <Muted>Trip ledger · passenger CO₂e</Muted>
          </View>
        </View>

        <View style={styles.statRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{formatKg(stats.totalCo2eKg)}</Text>
            <Text style={styles.statLabel}>logged CO₂e</Text>
          </View>
          <View style={styles.statRule} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{stats.tripCount}</Text>
            <Text style={styles.statLabel}>{stats.tripCount === 1 ? "trip" : "trips"}</Text>
          </View>
        </View>

        <Button label="Log a trip" onPress={() => navigation.navigate("LogTrip")} />

        {!online ? (
          <Text style={styles.banner}>
            Working from the on-device cache. Queued trips sync when the API is back.
          </Text>
        ) : null}
        {error && online ? <Text style={styles.banner}>{error}</Text> : null}

        <Text style={styles.section}>Recent</Text>

        {loading && trips.length === 0 ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.accent} />
            <Muted>Loading the ledger…</Muted>
          </View>
        ) : null}

        {!loading && trips.length === 0 ? (
          <EmptyState
            title="No trips on the ledger"
            body="Log a drive or flight. CarbonRoute estimates CO₂e from the Postgres factor table — not a hardcoded g/km."
          />
        ) : null}

        <View style={styles.list}>
          {trips.map((trip) => (
            <TripCard
              key={trip.id}
              trip={trip}
              onPress={() => navigation.navigate("TripDetail", { trip })}
            />
          ))}
        </View>

        <Button
          label={loading ? "Refreshing…" : "Refresh ledger"}
          onPress={() => void refresh()}
          disabled={loading}
          variant="ghost"
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: {
    padding: space.lg,
    paddingTop: space.xl,
    maxWidth: 520,
    width: "100%",
    alignSelf: "center",
    gap: space.lg,
    paddingBottom: 48,
  },
  masthead: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
  },
  mark: {
    width: 44,
    height: 44,
    backgroundColor: colors.accent,
    color: colors.white,
    textAlign: "center",
    textAlignVertical: "center",
    fontFamily: font.display,
    fontSize: 16,
    lineHeight: 44,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  mastText: {
    flex: 1,
    gap: 2,
  },
  statRow: {
    flexDirection: "row",
    alignItems: "stretch",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    paddingVertical: space.lg,
  },
  stat: {
    flex: 1,
    paddingHorizontal: space.lg,
    gap: 4,
  },
  statValue: {
    fontFamily: font.display,
    fontSize: 26,
    color: colors.ink,
  },
  statLabel: {
    fontFamily: font.body,
    fontSize: 13,
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statRule: {
    width: 1,
    backgroundColor: colors.line,
  },
  section: {
    fontFamily: font.bodyMed,
    fontSize: 13,
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.7,
    marginTop: space.sm,
  },
  list: {
    gap: space.md,
  },
  loading: {
    alignItems: "center",
    gap: space.sm,
    paddingVertical: space.xl,
  },
  banner: {
    fontFamily: font.body,
    fontSize: 14,
    color: colors.accentText,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space.md,
  },
});
