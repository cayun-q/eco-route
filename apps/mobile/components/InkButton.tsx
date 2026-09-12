import { Pressable, StyleSheet, Text, type PressableProps } from "react-native";
import { colors, radius, shadow } from "@/lib/theme";

type Props = PressableProps & {
  label: string;
  tone?: "accent" | "moss" | "ink" | "ghost";
};

export function InkButton({ label, tone = "accent", disabled, style, ...props }: Props) {
  const resolved = tone === "moss" ? "accent" : tone;
  const bg =
    resolved === "accent" ? colors.accent : resolved === "ink" ? colors.ink : colors.surface;
  const fg = resolved === "ghost" ? colors.ink : colors.surface;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: bg },
        resolved === "ghost" ? styles.ghost : shadow,
        disabled ? styles.disabled : null,
        pressed && !disabled ? styles.pressed : null,
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
    paddingVertical: 13,
    paddingHorizontal: 14,
    alignItems: "center",
  },
  ghost: {
    shadowOpacity: 0,
    elevation: 0,
  },
  pressed: {
    transform: [{ translateY: 2 }, { translateX: 2 }],
    shadowOffset: { width: 1, height: 1 },
    opacity: 1,
  },
  disabled: {
    opacity: 0.4,
  },
  label: {
    fontFamily: "SpaceMono",
    fontSize: 13,
    letterSpacing: 0.4,
  },
});
