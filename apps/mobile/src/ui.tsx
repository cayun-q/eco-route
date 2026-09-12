import { useState, type ReactNode } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { colors, radius, shadow, space, type as font } from "./theme";

export function Screen({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.screen, style]}>{children}</View>;
}

export function Card({
  children,
  style,
  padded = true,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
}) {
  return <View style={[styles.card, padded && styles.cardPad, style]}>{children}</View>;
}

export function Button({
  label,
  onPress,
  variant = "primary",
  disabled,
}: {
  label: string;
  onPress: () => void;
  variant?: "primary" | "ghost";
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.btn,
        variant === "primary" ? styles.btnPrimary : styles.btnGhost,
        pressed && !disabled && (variant === "primary" ? styles.btnPrimaryPressed : styles.btnGhostPressed),
        disabled && styles.btnDisabled,
      ]}
    >
      <Text
        style={[
          styles.btnLabel,
          variant === "primary" ? styles.btnLabelPrimary : styles.btnLabelGhost,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  tone = "accent",
  disabled = false,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  tone?: "accent" | "clay" | "warn" | "muted" | "car" | "plane" | "train";
  disabled?: boolean;
}) {
  const toneBg = {
    accent: colors.accent,
    clay: colors.clay,
    warn: colors.warn,
    muted: colors.ink,
    car: colors.mode.car,
    plane: colors.mode.plane,
    train: colors.mode.train,
  }[tone];
  const look = [
    styles.chip,
    selected ? { backgroundColor: toneBg, borderColor: toneBg } : styles.chipIdle,
    disabled ? styles.chipDisabled : null,
  ];
  const labelEl = (
    <Text
      style={[
        styles.chipLabel,
        selected ? styles.chipLabelOn : styles.chipLabelOff,
        disabled ? styles.chipLabelDisabled : null,
      ]}
    >
      {label}
    </Text>
  );
  if (!onPress || disabled) {
    return <View style={look}>{labelEl}</View>;
  }
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [...look, pressed ? { opacity: 0.88 } : null]}
    >
      {labelEl}
    </Pressable>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
    </View>
  );
}

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  autoComplete,
  ...rest
}: TextInputProps & { label: string }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        autoComplete={autoComplete}
        autoCorrect={false}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[styles.input, focused && styles.inputFocus]}
        {...rest}
      />
    </View>
  );
}

export function Heading({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.heading, style]}>{children}</Text>;
}

export function Muted({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.muted, style]}>{children}</Text>;
}

export function Rule() {
  return <View style={styles.rule} />;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadow.hard,
  },
  cardPad: {
    padding: space.lg,
  },
  btn: {
    minHeight: 48,
    borderRadius: radius.button,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.lg,
    borderWidth: 1,
  },
  btnPrimary: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  btnPrimaryPressed: {
    backgroundColor: colors.accentPressed,
    borderColor: colors.accentPressed,
  },
  btnGhost: {
    backgroundColor: "transparent",
    borderColor: colors.line,
  },
  btnGhostPressed: {
    backgroundColor: colors.surfaceMuted,
  },
  btnDisabled: {
    opacity: 0.45,
  },
  btnLabel: {
    fontFamily: font.bodyBold,
    fontSize: 16,
    letterSpacing: 0.2,
  },
  btnLabelPrimary: {
    color: colors.white,
  },
  btnLabelGhost: {
    color: colors.ink,
  },
  chip: {
    borderRadius: radius.chip,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    minHeight: 40,
    justifyContent: "center",
  },
  chipIdle: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.line,
  },
  chipDisabled: {
    opacity: 0.38,
  },
  chipLabel: {
    fontFamily: font.bodyMed,
    fontSize: 14,
  },
  chipLabelOn: {
    color: colors.white,
  },
  chipLabelOff: {
    color: colors.ink,
  },
  chipLabelDisabled: {
    color: colors.muted,
  },
  empty: {
    paddingVertical: space.xl,
    gap: space.sm,
  },
  emptyTitle: {
    fontFamily: font.display,
    fontSize: 22,
    color: colors.ink,
  },
  emptyBody: {
    fontFamily: font.body,
    fontSize: 15,
    lineHeight: 22,
    color: colors.muted,
  },
  field: {
    gap: space.xs,
  },
  fieldLabel: {
    fontFamily: font.bodyMed,
    fontSize: 13,
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    color: colors.ink,
    borderRadius: radius.card,
    paddingHorizontal: space.md,
    paddingVertical: 12,
    fontFamily: font.body,
    fontSize: 16,
  },
  inputFocus: {
    borderColor: colors.accent,
  },
  heading: {
    fontFamily: font.display,
    fontSize: 28,
    color: colors.ink,
  },
  muted: {
    fontFamily: font.body,
    fontSize: 14,
    color: colors.muted,
    lineHeight: 20,
  },
  rule: {
    height: 1,
    backgroundColor: colors.line,
  },
});
