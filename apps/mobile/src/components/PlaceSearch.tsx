import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { orderedPlaceSearch, toAsciiInput, type Place } from "@carbonroute/shared";
import { colors, radius, space, type as font } from "../theme";

type Props = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  onSelectPlace?: (place: Place) => void;
  placeholder?: string;
};

/**
 * Origin/destination search with ASCII-only input and ordered-token suggestions.
 * Does not use PlaceField or the old fuzzy lookupGazetteer matcher.
 */
export function PlaceSearch({
  label,
  value,
  onChangeText,
  onSelectPlace,
  placeholder,
}: Props) {
  const [focused, setFocused] = useState(false);
  const [picked, setPicked] = useState(false);

  const suggestions = useMemo(() => {
    if (picked || !focused) return [];
    const q = value.trim();
    if (!q) return [];
    return orderedPlaceSearch(q);
  }, [value, focused, picked]);

  function handleChange(text: string) {
    setPicked(false);
    onChangeText(toAsciiInput(text));
  }

  function handleSelect(place: Place) {
    setPicked(true);
    onChangeText(place.label);
    onSelectPlace?.(place);
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={handleChange}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        autoCorrect={false}
        autoCapitalize="words"
        onFocus={() => {
          setFocused(true);
          setPicked(false);
        }}
        onBlur={() => {
          // Delay so suggestion press can register before list hides.
          setTimeout(() => setFocused(false), 150);
        }}
        style={[styles.input, focused && styles.inputFocus]}
      />
      {suggestions.length > 0 ? (
        <View style={styles.list}>
          {suggestions.map((place) => (
            <Pressable
              key={`${place.label}-${place.lat}-${place.lng}`}
              accessibilityRole="button"
              onPress={() => handleSelect(place)}
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            >
              <Text style={styles.rowText}>{place.label}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
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
  list: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    overflow: "hidden",
  },
  row: {
    paddingHorizontal: space.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  rowPressed: {
    backgroundColor: colors.accentSoft,
  },
  rowText: {
    fontFamily: font.body,
    fontSize: 15,
    color: colors.ink,
  },
});
