import { Pressable, StyleSheet, Text } from "react-native";
import type { TravelMode } from "@carbonroute/shared";
import { formatKg } from "@/lib/format";
import { colors, modeColor, radius } from "@/lib/theme";

export function ModeChip({
  mode,
  selected,
  onPress,
}: {
  mode: TravelMode;
  selected?: boolean;
  onPress?: () => void;
}) {
  const color = modeColor[mode];
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        { borderColor: color, backgroundColor: selected ? color : colors.paper },
      ]}
    >
      <Text style={[styles.text, { color: selected ? colors.paper : color }]}>
        {mode}
      </Text>
    </Pressable>
  );
}

export function StatChip({ label, value, color = colors.ink }: { label: string; value: string; color?: string }) {
  return (
    <Pressable style={[styles.stat, { borderColor: color }]}>
      <Text style={[styles.statLabel, { color }]}>{label}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
    </Pressable>
  );
}

export function Co2Chip({ kg, color = colors.moss }: { kg: number; color?: string }) {
  return <StatChip label="CO₂e" value={formatKg(kg)} color={color} />;
}

const styles = StyleSheet.create({
  chip: {
    borderWidth: 1,
    borderRadius: radius,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  text: {
    fontFamily: "SpaceMono",
    fontSize: 12,
    textTransform: "uppercase",
  },
  stat: {
    borderWidth: 1,
    borderRadius: radius,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: colors.white,
  },
  statLabel: {
    fontFamily: "SpaceMono",
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  statValue: {
    fontFamily: "SpaceMono",
    fontSize: 14,
    marginTop: 2,
  },
});
