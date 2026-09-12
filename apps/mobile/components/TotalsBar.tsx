import { StyleSheet, Text, View } from "react-native";
import type { EstimatedLeg, TripTotals } from "@carbonroute/shared";
import { formatDuration, formatKg, formatKm } from "@/lib/format";
import { colors, modeColor } from "@/lib/theme";
import { ModeChip, StatChip } from "./ModeChip";

export function TotalsBar({ totals }: { totals: TripTotals }) {
  return (
    <View style={styles.row}>
      <StatChip label="Total CO₂e" value={formatKg(totals.co2eKg)} color={colors.accent} />
      <StatChip label="Distance" value={formatKm(totals.distanceKm)} />
      <StatChip label="Time" value={formatDuration(totals.durationMin)} />
    </View>
  );
}

export function StickyCo2({ kg }: { kg: number }) {
  return (
    <View style={styles.sticky}>
      <Text style={styles.stickyLabel}>Total CO₂e</Text>
      <Text style={styles.stickyValue}>{formatKg(kg)}</Text>
    </View>
  );
}

export function LegBreakdown({ legs }: { legs: EstimatedLeg[] }) {
  const total = legs.reduce((sum, leg) => sum + leg.co2eKg, 0);
  return (
    <View style={styles.legs}>
      {legs.map((leg) => (
        <View key={leg.seq} style={styles.legRow}>
          <ModeChip mode={leg.mode} selected />
          <View style={styles.legBody}>
            <Text style={styles.legPath}>
              {leg.origin.label} → {leg.destination.label}
            </Text>
            <Text style={styles.legMeta}>
              {formatKm(leg.distanceKm)} · {formatDuration(leg.durationMin)}
            </Text>
          </View>
          <Text style={[styles.legCo2, { color: modeColor[leg.mode] }]}>{formatKg(leg.co2eKg)}</Text>
        </View>
      ))}
      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Total CO₂e</Text>
        <Text style={styles.totalValue}>{formatKg(total)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  sticky: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.ink,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  stickyLabel: {
    fontFamily: "SpaceMono",
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: colors.accentText,
  },
  stickyValue: {
    fontFamily: "SpaceMono",
    fontSize: 24,
    color: colors.accentText,
    fontWeight: "700",
  },
  legs: {
    gap: 10,
  },
  legRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  legBody: {
    flex: 1,
    minWidth: 0,
  },
  legPath: {
    color: colors.ink,
    fontSize: 15,
  },
  legMeta: {
    fontFamily: "SpaceMono",
    color: colors.accentText,
    fontSize: 11,
    marginTop: 2,
  },
  legCo2: {
    fontFamily: "SpaceMono",
    fontSize: 14,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    borderTopWidth: 1,
    borderTopColor: colors.ink,
    paddingTop: 10,
    marginTop: 2,
  },
  totalLabel: {
    fontFamily: "SpaceMono",
    fontSize: 13,
    color: colors.ink,
    letterSpacing: 0.4,
  },
  totalValue: {
    fontFamily: "SpaceMono",
    fontSize: 24,
    color: colors.accentText,
    fontWeight: "700",
  },
});
