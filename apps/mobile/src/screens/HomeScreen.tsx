import { useCallback, useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation";
import { useStore } from "../store";
import { colors, radius, space, type as font } from "../theme";
import { Button, EmptyState, Heading, Muted, Screen } from "../ui";
import { TripCard } from "../components/TripCard";
import { LumaMenuButton } from "../components/LumaMenu";
import { formatKg } from "../format";

const logo = require("../../../../1.png");

type Props = NativeStackScreenProps<RootStackParamList, "Home">;

function formatRefreshTime(value: number | null): string | null {
  if (!value) return null;
  return new Date(value).toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" });
}

export function HomeScreen({ navigation }: Props) {
  const { trips, stats, loading, error, online, lastRefreshedAt, refresh, deleteTrip, clearTrips } = useStore();
  const insets = useSafeAreaInsets();
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearing, setClearing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const refreshedLabel = formatRefreshTime(lastRefreshedAt);

  async function clearAll() {
    setClearing(true);
    try {
      await clearTrips();
      setConfirmClear(false);
    } finally {
      setClearing(false);
    }
  }

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={[styles.wrap, { paddingTop: Math.max(insets.top, 24) }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.topbar}>
          <LumaMenuButton />
          <Text style={styles.topbarWord}>Luma</Text>
        </View>

        <View style={styles.masthead}>
          <View style={styles.logoShell}>
            <Image source={logo} style={styles.logo} resizeMode="cover" />
          </View>
          <View style={styles.mastText}>
            <Heading>Luma</Heading>
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

        <View style={styles.sectionRow}>
          <Text style={styles.section}>Recent</Text>
          {trips.length > 0 && !confirmClear ? (
            <Pressable onPress={() => setConfirmClear(true)} style={styles.clearLink}>
              <Text style={styles.clearLinkText}>Clear logs</Text>
            </Pressable>
          ) : null}
        </View>

        {confirmClear ? (
          <View style={styles.clearConfirm}>
            <View style={styles.clearCopy}>
              <Text style={styles.clearTitle}>Clear every logged trip?</Text>
              <Text style={styles.clearBody}>This removes all saved trip logs and queued offline logs. This cannot be undone.</Text>
            </View>
            <View style={styles.clearActions}>
              <Pressable disabled={clearing} onPress={() => void clearAll()} style={styles.clearDanger}>
                <Text style={styles.clearDangerText}>{clearing ? "Clearing…" : "Yes, clear all"}</Text>
              </Pressable>
              <Pressable disabled={clearing} onPress={() => setConfirmClear(false)} style={styles.clearCancel}>
                <Text style={styles.clearCancelText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {loading && trips.length === 0 ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.accent} />
            <Muted>Loading your trips…</Muted>
          </View>
        ) : null}

        {!loading && trips.length === 0 ? (
          <EmptyState
            title="No trips on the ledger"
            body="Log a drive or flight. Luma estimates passenger CO₂e using routing data and the configured emissions factors."
          />
        ) : null}

        <View style={styles.list}>
          {trips.map((trip) => (
            <TripCard
              key={trip.id}
              trip={trip}
              onPress={() => navigation.navigate("TripDetail", { trip })}
              onDelete={() => deleteTrip(trip)}
            />
          ))}
        </View>

        <Button
          label={loading ? "Refreshing…" : "Refresh ledger"}
          onPress={() => void refresh()}
          disabled={loading}
          variant="ghost"
        />
        {refreshedLabel && online ? (
          <Text style={styles.refreshed}>Last refreshed {refreshedLabel}</Text>
        ) : null}
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
  topbar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  topbarWord: {
    fontFamily: font.bodyMed,
    fontSize: 15,
    color: colors.ink,
    letterSpacing: 0.2,
  },
  masthead: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
  },
  logoShell: {
    width: 66,
    height: 66,
    borderRadius: radius.card,
    overflow: "hidden",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  logo: {
    width: "100%",
    height: "100%",
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
    borderRadius: radius.card,
    overflow: "hidden",
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
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: space.sm,
  },
  section: {
    fontFamily: font.bodyMed,
    fontSize: 13,
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  clearLink: { paddingVertical: 5, paddingHorizontal: 2 },
  clearLinkText: {
    fontFamily: font.bodyMed,
    fontSize: 13,
    color: colors.danger,
  },
  clearConfirm: {
    padding: space.md,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
    gap: space.md,
  },
  clearCopy: { gap: 4 },
  clearTitle: {
    fontFamily: font.bodyBold,
    fontSize: 14,
    color: colors.danger,
  },
  clearBody: {
    fontFamily: font.body,
    fontSize: 13,
    lineHeight: 19,
    color: colors.muted,
  },
  clearActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: space.sm,
  },
  clearDanger: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: radius.button,
    backgroundColor: colors.danger,
  },
  clearDangerText: {
    fontFamily: font.bodyMed,
    fontSize: 13,
    color: colors.white,
  },
  clearCancel: { paddingHorizontal: 10, paddingVertical: 9 },
  clearCancelText: {
    fontFamily: font.bodyMed,
    fontSize: 13,
    color: colors.muted,
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
    borderRadius: radius.card,
    padding: space.md,
  },
  refreshed: {
    marginTop: -space.md,
    textAlign: "center",
    fontFamily: font.body,
    fontSize: 12,
    color: colors.muted,
  },
});
