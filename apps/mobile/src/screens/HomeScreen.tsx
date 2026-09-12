import {
  formatEmissions,
  modeLabel,
  type TravelMode,
} from "@carbonroute/shared";
import { useMemo } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Button, Card, EmptyState } from "../components/ui";
import { TripCard } from "../components/TripCard";
import { useApp } from "../context/AppContext";
import { colors, modeColor } from "../theme";

export function HomeScreen() {
  const { summary, trips, queue, online, loading, error, go, refresh } = useApp();
  const recent = trips.slice(0, 8);
  const maxMode = Math.max(1, ...summary.byMode.map((row) => row.gramsCo2e));
  const modes: TravelMode[] = ["car", "plane", "train"];
  const byMode = useMemo(() => {
    return modes.map((mode) => {
      const row = summary.byMode.find((item) => item.mode === mode);
      return { mode, gramsCo2e: row?.gramsCo2e ?? 0, tripCount: row?.tripCount ?? 0 };
    });
  }, [summary]);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void refresh()} />}
    >
      <View style={styles.topRow}>
        <View>
          <Text style={styles.kicker}>Dashboard</Text>
          <Text style={styles.heading}>Your travel footprint</Text>
        </View>
        <View style={[styles.pill, !online && styles.pillWarn]}>
          <Text style={[styles.pillText, !online && styles.pillTextWarn]}>
            {online ? "Live" : queue.length ? `${queue.length} queued` : "Offline"}
          </Text>
        </View>
      </View>

      <Card style={styles.hero}>
        {loading && !trips.length ? (
          <ActivityIndicator color={colors.accent} />
        ) : (
          <>
            <Text style={styles.heroLabel}>Cumulative emissions</Text>
            <Text style={styles.heroValue}>{formatEmissions(summary.totalGramsCo2e)}</Text>
            <Text style={styles.heroMeta}>
              {summary.tripCount === 0
                ? "No trips logged yet"
                : `${summary.tripCount} trip${summary.tripCount === 1 ? "" : "s"} logged`}
            </Text>
          </>
        )}
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>By mode</Text>
        {summary.tripCount === 0 ? (
          <Text style={styles.muted}>Log a trip to see the car / plane / train split.</Text>
        ) : (
          <View style={styles.bars}>
            {byMode.map((row) => (
              <View key={row.mode} style={styles.barRow}>
                <Text style={styles.barLabel}>{modeLabel(row.mode)}</Text>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        width: `${Math.max(4, (row.gramsCo2e / maxMode) * 100)}%`,
                        backgroundColor: modeColor(row.mode),
                      },
                    ]}
                  />
                </View>
                <Text style={styles.barValue}>{formatEmissions(row.gramsCo2e)}</Text>
              </View>
            ))}
          </View>
        )}
      </Card>

      {error ? (
        <Card style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={() => void refresh()}>
            <Text style={styles.retry}>Try again</Text>
          </Pressable>
        </Card>
      ) : null}

      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>Recent trips</Text>
        <Text style={styles.muted}>{online ? "Synced" : "Showing cached + queue"}</Text>
      </View>

      {recent.length === 0 ? (
        <EmptyState
          title="No trips yet"
          body="Log a commute, rail journey, or flight. Emissions come from the swappable factor table, not hardcoded constants."
        />
      ) : (
        <Card>
          {recent.map((trip, index) => (
            <View key={trip.id}>
              {index > 0 ? <View style={styles.divider} /> : null}
              <TripCard trip={trip} onPress={() => go({ name: "detail", tripId: trip.id })} />
            </View>
          ))}
        </Card>
      )}

      <Button label="Log a trip" onPress={() => go({ name: "log" })} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, gap: 16, paddingBottom: 40 },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  kicker: { color: colors.accent, fontWeight: "700", letterSpacing: 0.4 },
  heading: { color: colors.ink, fontSize: 26, fontWeight: "800", marginTop: 4 },
  pill: {
    backgroundColor: colors.accentSoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  pillWarn: { backgroundColor: colors.warnSoft },
  pillText: { color: colors.accentText, fontWeight: "700", fontSize: 12 },
  pillTextWarn: { color: colors.warn },
  hero: { paddingVertical: 22 },
  heroLabel: { color: colors.muted, fontWeight: "600" },
  heroValue: { color: colors.ink, fontSize: 36, fontWeight: "800", marginTop: 6 },
  heroMeta: { color: colors.muted, marginTop: 6 },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: colors.ink },
  sectionHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  muted: { color: colors.muted },
  bars: { gap: 12, marginTop: 12 },
  barRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  barLabel: { width: 52, color: colors.ink, fontWeight: "600" },
  barTrack: {
    flex: 1,
    height: 10,
    backgroundColor: colors.surfaceMuted,
    borderRadius: 999,
    overflow: "hidden",
  },
  barFill: { height: 10, borderRadius: 999 },
  barValue: { width: 84, textAlign: "right", color: colors.muted, fontSize: 12 },
  divider: { height: 1, backgroundColor: colors.line },
  errorCard: { backgroundColor: "#FDECEC", borderColor: "#F2C0C0" },
  errorText: { color: colors.danger, fontWeight: "600" },
  retry: { color: colors.accent, fontWeight: "700", marginTop: 8 },
});
