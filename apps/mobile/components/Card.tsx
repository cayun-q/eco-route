import { StyleSheet, View, type ViewProps } from "react-native";
import { colors, radius, shadow } from "@/lib/theme";

export function Card({ style, ...props }: ViewProps) {
  return <View style={[styles.card, style]} {...props} />;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius,
    borderWidth: 1,
    borderColor: colors.ink,
    padding: 14,
    ...shadow,
  },
});
