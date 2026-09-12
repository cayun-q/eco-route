import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { searchAirports as localAirports, searchPlaces as localSearch, type Place, type TravelMode } from "@carbonroute/shared";
import { suggestAirports, suggestPlaces } from "@/lib/api";
import { colors, radius } from "@/lib/theme";

const MIN_CHARS = 2;

export function PlaceField({
  label,
  value,
  onChange,
  mode,
}: {
  label: string;
  value: Place | null;
  onChange: (place: Place | null) => void;
  mode?: TravelMode;
}) {
  const [query, setQuery] = useState(value?.label ?? "");
  const [hits, setHits] = useState<Place[]>([]);
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "empty">("idle");

  useEffect(() => {
    setQuery(value?.label ?? "");
  }, [value?.id, value?.label]);

  useEffect(() => {
    if (!open || query.trim().length < MIN_CHARS) {
      setHits([]);
      setStatus("idle");
      return;
    }
    setStatus("loading");
    const handle = setTimeout(() => {
      const fetchHits = mode === "plane" ? suggestAirports(query) : suggestPlaces(query, mode);
      fetchHits
        .then((res) => {
          setHits(res.places);
          setStatus(res.places.length ? "idle" : "empty");
        })
        .catch(() => {
          const local = mode === "plane" ? localAirports(query, 8) : localSearch(query, 8);
          setHits(local);
          setStatus(local.length ? "idle" : "empty");
        });
    }, 280);
    return () => clearTimeout(handle);
  }, [query, open, mode]);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={query}
        placeholder={mode === "plane" ? "Airport or IATA…" : "Street, city, station…"}
        placeholderTextColor={colors.inkMuted}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          setTimeout(() => setOpen(false), 180);
        }}
        onChangeText={(text) => {
          setQuery(text);
          setOpen(true);
          if (value && text !== value.label) onChange(null);
        }}
        style={styles.input}
        autoCorrect={false}
        autoCapitalize="none"
      />
      {open && query.trim().length >= MIN_CHARS ? (
        <View style={styles.menu}>
          {status === "loading" && hits.length === 0 ? (
            <Text style={styles.hint}>Looking up places…</Text>
          ) : null}
          {status === "empty" ? <Text style={styles.hint}>No matches</Text> : null}
          {hits.map((place) => (
            <Pressable
              key={place.id}
              style={styles.hit}
              onPressIn={() => {
                onChange(place);
                setQuery(place.label);
                setOpen(false);
              }}
            >
              <Text style={styles.hitLabel}>{place.label}</Text>
              <Text style={styles.hitKind}>
                {place.iata ? `${place.iata} · ` : ""}
                {place.kind}
                {place.region ? ` · ${place.region}` : ""}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    zIndex: 2,
  },
  label: {
    fontFamily: "SpaceMono",
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: colors.inkMuted,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.ink,
    borderRadius: radius,
    paddingHorizontal: 10,
    paddingVertical: 9,
    backgroundColor: colors.white,
    color: colors.ink,
    fontSize: 15,
  },
  menu: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: colors.ink,
    borderRadius: radius,
    backgroundColor: colors.white,
    overflow: "hidden",
  },
  hint: {
    fontFamily: "SpaceMono",
    fontSize: 11,
    color: colors.inkMuted,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  hit: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  hitLabel: {
    color: colors.ink,
    fontSize: 15,
  },
  hitKind: {
    fontFamily: "SpaceMono",
    fontSize: 11,
    color: colors.inkMuted,
    marginTop: 1,
  },
});
