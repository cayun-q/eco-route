import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { searchAirports as localAirports, searchPlaces as localSearch, type Place, type TravelMode } from "@carbonroute/shared";
import { suggestAirports, suggestPlaces } from "@/lib/api";
import { colors, radius } from "@/lib/theme";

const MIN_CHARS = 2;
const REMOTE_DEBOUNCE_MS = 240;

function mergePlaces(local: Place[], remote: Place[]): Place[] {
  const out: Place[] = [...local];
  for (const place of remote) {
    const dup = out.find(
      (p) =>
        p.id === place.id ||
        p.label.toLowerCase() === place.label.toLowerCase(),
    );
    if (dup) {
      const idx = out.indexOf(dup);
      out[idx] = place;
    } else {
      out.push(place);
    }
  }
  return out;
}

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

    const local = mode === "plane" ? localAirports(query, 8) : localSearch(query, 8);
    if (local.length) {
      setHits(local);
      setStatus("idle");
    } else {
      setHits([]);
      setStatus("loading");
    }

    const controller = new AbortController();
    const handle = setTimeout(() => {
      const fetchHits =
        mode === "plane"
          ? suggestAirports(query, controller.signal)
          : suggestPlaces(query, mode, controller.signal);
      fetchHits
        .then((res) => {
          if (controller.signal.aborted) return;
          const merged = mergePlaces(local, res.places);
          setHits(merged);
          setStatus(merged.length ? "idle" : "empty");
        })
        .catch((err: unknown) => {
          if (controller.signal.aborted) return;
          if (err instanceof Error && err.name === "AbortError") return;
          if (local.length) {
            setHits(local);
            setStatus("idle");
          } else {
            setHits([]);
            setStatus("empty");
          }
        });
    }, REMOTE_DEBOUNCE_MS);

    return () => {
      clearTimeout(handle);
      controller.abort();
    };
  }, [query, open, mode]);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={query}
        placeholder={mode === "plane" ? "Airport or IATA…" : "Street, city, station…"}
        placeholderTextColor={colors.muted}
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
    color: colors.muted,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.ink,
    borderRadius: radius,
    paddingHorizontal: 10,
    paddingVertical: 9,
    backgroundColor: colors.surface,
    color: colors.ink,
    fontSize: 15,
  },
  menu: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: colors.ink,
    borderRadius: radius,
    backgroundColor: colors.surface,
    overflow: "hidden",
  },
  hint: {
    fontFamily: "SpaceMono",
    fontSize: 11,
    color: colors.muted,
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
    color: colors.muted,
    marginTop: 1,
  },
});
