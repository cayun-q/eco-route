import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useStore } from "../store";
import { colors, radius, space, type as font } from "../theme";
import { Heading, Muted, Screen } from "../ui";
import type { MeasurementSystem } from "../format";

export function SettingsScreen() {
  const { measurementSystem, setMeasurementSystem } = useStore();

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.wrap}>
        <Heading>Settings</Heading>
        <Muted>Choose how Luma displays distances and carbon totals. Stored trip data stays unchanged.</Muted>

        <View style={styles.section}>
          <Text style={styles.label}>Units</Text>
          <UnitOption
            title="Metric"
            detail="Kilometers · kilograms CO₂e"
            value="metric"
            selected={measurementSystem === "metric"}
            onSelect={setMeasurementSystem}
          />
          <UnitOption
            title="Imperial"
            detail="Miles · pounds CO₂e"
            value="imperial"
            selected={measurementSystem === "imperial"}
            onSelect={setMeasurementSystem}
          />
        </View>

        <Text style={styles.note}>
          This only changes how values are shown in the app. Luma keeps its routing and emissions calculations in their original units so switching back and forth does not lose precision.
        </Text>
      </ScrollView>
    </Screen>
  );
}

function UnitOption({
  title,
  detail,
  value,
  selected,
  onSelect,
}: {
  title: string;
  detail: string;
  value: MeasurementSystem;
  selected: boolean;
  onSelect: (value: MeasurementSystem) => Promise<void>;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={() => void onSelect(value)}
      style={({ pressed }) => [styles.option, selected && styles.optionSelected, pressed && styles.optionPressed]}
    >
      <View style={[styles.radio, selected && styles.radioSelected]}>{selected ? <View style={styles.radioDot} /> : null}</View>
      <View style={styles.optionCopy}>
        <Text style={styles.optionTitle}>{title}</Text>
        <Text style={styles.optionDetail}>{detail}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    padding: space.lg,
    paddingTop: space.xl,
    paddingBottom: 48,
    maxWidth: 620,
    width: "100%",
    alignSelf: "center",
    gap: space.lg,
  },
  section: {
    gap: space.sm,
  },
  label: {
    fontFamily: font.bodyMed,
    fontSize: 13,
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.7,
    marginBottom: 2,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    padding: space.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.card,
  },
  optionSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  optionPressed: { opacity: 0.82 },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
  },
  radioSelected: { borderColor: colors.accent },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accent,
  },
  optionCopy: { flex: 1, gap: 3 },
  optionTitle: {
    fontFamily: font.bodyMed,
    fontSize: 16,
    color: colors.ink,
  },
  optionDetail: {
    fontFamily: font.body,
    fontSize: 13,
    color: colors.muted,
  },
  note: {
    fontFamily: font.body,
    fontSize: 13,
    lineHeight: 20,
    color: colors.muted,
  },
});
