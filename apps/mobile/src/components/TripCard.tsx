import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { Trip } from "@carbonroute/shared";
import { colorsForTheme, radius, shadowFor, space, type as font, type ThemeColors } from "../theme";
import { formatDate, formatKg, formatKm, modeLabel, placeDisplayLabel } from "../format";
import { useStore } from "../store";
import { Chip } from "../ui";

export function TripCard({ trip, onPress, onDelete }: { trip: Trip; onPress: () => void; onDelete: () => Promise<void> | void }) {
  const { measurementSystem, displayPrecision, resolvedTheme } = useStore();
  const colors = colorsForTheme(resolvedTheme);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const high = trip.mode === "plane" || trip.co2eKg >= 20;
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function remove() {
    setDeleting(true);
    try { await onDelete(); } finally { setDeleting(false); setConfirming(false); }
  }

  return (
    <View style={styles.card}>
      <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.main, pressed && styles.pressed]}>
        <View style={styles.top}>
          <Text style={styles.route} numberOfLines={2}>{placeDisplayLabel(trip.originLabel)} → {placeDisplayLabel(trip.destinationLabel)}</Text>
          <Chip label={modeLabel(trip.mode)} selected tone={trip.mode} />
        </View>
        <Text style={styles.meta}>{formatKm(trip.distanceKm, measurementSystem, displayPrecision)} · {formatKg(trip.co2eKg, measurementSystem, displayPrecision)} CO₂e{trip.pending ? " · queued" : ""}</Text>
        <Text style={styles.date}>{formatDate(trip.createdAt)}</Text>
        {high ? <Text style={styles.high}>High-emission trip</Text> : null}
      </Pressable>
      <View style={styles.actions}>
        {confirming ? <>
          <Text style={styles.confirmText}>Delete this log?</Text>
          <Pressable disabled={deleting} onPress={() => void remove()} style={styles.confirmDelete}><Text style={styles.confirmDeleteText}>{deleting ? "Deleting…" : "Yes, delete"}</Text></Pressable>
          <Pressable disabled={deleting} onPress={() => setConfirming(false)} style={styles.cancelDelete}><Text style={styles.cancelDeleteText}>Cancel</Text></Pressable>
        </> : <Pressable onPress={() => setConfirming(true)} style={styles.deleteButton}><Text style={styles.deleteText}>Delete</Text></Pressable>}
      </View>
    </View>
  );
}

function makeStyles(colors: ThemeColors) {
  const shadow = shadowFor(colors);
  return StyleSheet.create({
    card: { backgroundColor: colors.surface, borderRadius: radius.card, borderWidth: 1, borderColor: colors.line, overflow: "hidden", ...shadow.hard },
    main: { padding: space.lg, gap: 6 }, pressed: { backgroundColor: colors.surfaceMuted },
    top: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: space.md },
    route: { flex: 1, fontFamily: font.display, fontSize: 18, color: colors.ink },
    meta: { fontFamily: font.bodyMed, fontSize: 14, color: colors.ink }, date: { fontFamily: font.body, fontSize: 13, color: colors.muted },
    high: { fontFamily: font.bodyMed, fontSize: 12, color: colors.clay, textTransform: "uppercase", letterSpacing: 0.5 },
    actions: { minHeight: 42, paddingHorizontal: space.lg, paddingVertical: space.sm, borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.surfaceMuted, flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: space.sm },
    deleteButton: { paddingVertical: 6, paddingHorizontal: 2 }, deleteText: { fontFamily: font.bodyMed, fontSize: 13, color: colors.danger },
    confirmText: { flex: 1, minWidth: 100, fontFamily: font.bodyMed, fontSize: 13, color: colors.ink },
    confirmDelete: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: radius.button, backgroundColor: colors.danger },
    confirmDeleteText: { fontFamily: font.bodyMed, fontSize: 12, color: colors.white }, cancelDelete: { paddingHorizontal: 8, paddingVertical: 7 },
    cancelDeleteText: { fontFamily: font.bodyMed, fontSize: 12, color: colors.muted },
  });
}
