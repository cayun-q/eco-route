import { useState } from "react";
import { Image, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation";
import { colors, radius, shadow, space, type as font } from "../theme";

const logo = require("../../../../1.png");

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function LumaMenuButton() {
  const navigation = useNavigation<Nav>();
  const [open, setOpen] = useState(false);

  function go(route: "Home" | "LogTrip" | "About" | "Credits") {
    setOpen(false);
    if (route === "Home") navigation.navigate("Home");
    if (route === "LogTrip") navigation.navigate("LogTrip");
    if (route === "About") navigation.navigate("About");
    if (route === "Credits") navigation.navigate("Credits");
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open menu"
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.trigger, pressed && styles.pressed]}
      >
        <Text style={styles.triggerText}>☰</Text>
      </Pressable>

      <Modal transparent visible={open} animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.modalRoot}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} />
          <View style={styles.panel}>
            <View style={styles.brandRow}>
              <View style={styles.logoShell}>
                <Image source={logo} style={styles.logo} resizeMode="cover" />
              </View>
              <View style={styles.brandCopy}>
                <Text style={styles.brand}>Luma</Text>
                <Text style={styles.tagline}>Travel carbon, made visible.</Text>
              </View>
            </View>

            <View style={styles.rule} />
            <MenuItem label="Trips" detail="Your trip ledger" onPress={() => go("Home")} />
            <MenuItem label="Log trip" detail="Automatic or manual itinerary" onPress={() => go("LogTrip")} />
            <MenuItem label="About" detail="What Luma does" onPress={() => go("About")} />
            <MenuItem label="Credits" detail="Data, tools, and acknowledgements" onPress={() => go("Credits")} />
          </View>
        </View>
      </Modal>
    </>
  );
}

function MenuItem({ label, detail, onPress }: { label: string; detail: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}>
      <Text style={styles.itemLabel}>{label}</Text>
      <Text style={styles.itemDetail}>{detail}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  trigger: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  pressed: { opacity: 0.72 },
  triggerText: {
    fontFamily: font.bodyMed,
    fontSize: 21,
    lineHeight: 24,
    color: colors.ink,
  },
  modalRoot: {
    flex: 1,
    backgroundColor: "rgba(25, 30, 25, 0.26)",
    alignItems: "flex-start",
  },
  panel: {
    width: 310,
    maxWidth: "86%",
    height: "100%",
    backgroundColor: colors.bg,
    paddingTop: 42,
    paddingHorizontal: space.lg,
    gap: 6,
    borderRightWidth: 1,
    borderRightColor: colors.line,
    ...shadow.hard,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    marginBottom: space.md,
  },
  logoShell: {
    width: 58,
    height: 58,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  logo: { width: "100%", height: "100%" },
  brandCopy: { flex: 1, gap: 2 },
  brand: {
    fontFamily: font.display,
    fontSize: 27,
    color: colors.ink,
  },
  tagline: {
    fontFamily: font.body,
    fontSize: 12,
    lineHeight: 17,
    color: colors.muted,
  },
  rule: {
    height: 1,
    backgroundColor: colors.line,
    marginBottom: space.sm,
  },
  item: {
    paddingVertical: 13,
    paddingHorizontal: 10,
    borderRadius: radius.button,
    gap: 2,
  },
  itemPressed: { backgroundColor: colors.surfaceMuted },
  itemLabel: {
    fontFamily: font.bodyMed,
    fontSize: 16,
    color: colors.ink,
  },
  itemDetail: {
    fontFamily: font.body,
    fontSize: 12,
    color: colors.muted,
  },
});
