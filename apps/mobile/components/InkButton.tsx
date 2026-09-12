import { Pressable, StyleSheet, Text, type PressableProps } from "react-native";
import { colors, radius, shadow } from "@/lib/theme";

type Props = PressableProps & {
  label: string;
  tone?: "moss" | "ink" | "ghost";
};

export function InkButton({ label, tone = "moss", disabled, style, ...props }: Props) {
  const bg = tone === "moss" ? colors.moss : tone === "ink" ? colors.ink : colors.paper;
  const fg = tone === "ghost" ? colors.ink : colors.paper;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: bg, opacity: disabled ? 0.45 : pressed ? 0.86 : 1 },
        tone === "ghost" ? styles.ghost : shadow,
        style,
      ]}
      {...props}
    >
      <Text style={[styles.label, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    borderRadius: radius,
    borderWidth: 1,
    borderColor: colors.ink,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: "center",
  },
  ghost: {
    shadowOpacity: 0,
    elevation: 0,
  },
  label: {
    fontFamily: "SpaceMono",
    fontSize: 13,
    letterSpacing: 0.4,
  },
});
