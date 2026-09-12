import { getPlace, searchPlaces, type Place, type TravelMode } from "@carbonroute/shared";
import { suggestAirports } from "./airports.js";

const UA = "CarbonRoute/1.0 (multi-leg travel emissions; https://origin.cursor.com)";
const cache = new Map<string, { at: number; places: Place[] }>();
const CACHE_MS = 2 * 60 * 1000;
/** When gazetteer hits exist, do not block the first response on Nominatim longer than this. */
const PROVIDER_BUDGET_MS = 400;

export function parseLatLng(query: string): Place | null {
  const m = query.trim().match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
  if (!m) return null;
  const lat = Number(m[1]);
  const lng = Number(m[2]);
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return {
    id: `latlng:${lat},${lng}`,
    label: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
    kind: "address",
    lat,
    lng,
  };
}

function cacheGet(key: string): Place[] | null {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_MS) {
    cache.delete(key);
    return null;
  }
  return hit.places;
}

function cacheSet(key: string, places: Place[]) {
  cache.set(key, { at: Date.now(), places });
}

/** Test helper — clears the in-process suggest cache. */
export function clearSuggestCache() {
  cache.clear();
}

function gazetteerHits(query: string, limit = 6): Place[] {
  return searchPlaces(query, limit);
}

function humanNominatimLabel(hit: {
  name?: string;
  display_name?: string;
  address?: Record<string, string>;
}): string {
  const address = hit.address ?? {};
  const city = address.city || address.town || address.village || address.hamlet || address.state;
  if (hit.name && city && !hit.name.toLowerCase().includes(city.toLowerCase())) {
    return `${hit.name}, ${city}`;
  }
  if (hit.name) return hit.name;
  return (hit.display_name ?? "")
    .split(",")
    .slice(0, 3)
    .map((p) => p.trim())
    .filter(Boolean)
    .join(", ");
}

function nominatimKind(hit: { type?: string; class?: string; addresstype?: string }): Place["kind"] {
  const t = `${hit.type ?? ""} ${hit.class ?? ""} ${hit.addresstype ?? ""}`.toLowerCase();
  if (t.includes("aerodrome") || t.includes("airport")) return "airport";
  if (t.includes("station") || t.includes("railway")) return "station";
  if (t.includes("city") || t.includes("town") || t.includes("village") || t.includes("administrative")) return "city";
  return "address";
}

async function fetchJson(url: string, headers: Record<string, string> = {}, ms = 3500): Promise<unknown> {
  const res = await fetch(url, {
    headers: { Accept: "application/json", ...headers },
    signal: AbortSignal.timeout(ms),
  });
  if (!res.ok) throw new Error(`Upstream ${res.status}`);
  return res.json();
}

type NominatimHit = {
  place_id: number;
  lat: string;
  lon: string;
  name?: string;
  display_name?: string;
  type?: string;
  class?: string;
  addresstype?: string;
  address?: Record<string, string>;
};

async function nominatimSearch(query: string, limit: number): Promise<Place[]> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", String(limit));
  const rows = (await fetchJson(url.toString(), { "User-Agent": UA })) as NominatimHit[];
  return rows.map((hit) => ({
    id: `nominatim:${hit.place_id}`,
    label: humanNominatimLabel(hit) || hit.display_name || query,
    kind: nominatimKind(hit),
    lat: Number(hit.lat),
    lng: Number(hit.lon),
    region: hit.address?.country_code?.toUpperCase(),
  }));
}

function hasMapboxToken(): boolean {
  return Boolean(process.env.MAPBOX_TOKEN || process.env.MAPBOX_ACCESS_TOKEN);
}

function hasGoogleToken(): boolean {
  return Boolean(process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_API_KEY);
}

async function mapboxSearch(query: string, limit: number): Promise<Place[]> {
  const token = process.env.MAPBOX_TOKEN || process.env.MAPBOX_ACCESS_TOKEN;
  if (!token) return [];
  const url = new URL(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`);
  url.searchParams.set("access_token", token);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("types", "address,place,locality,neighborhood,poi");
  const data = (await fetchJson(url.toString())) as {
    features?: { id: string; place_name: string; text: string; center: [number, number]; place_type?: string[] }[];
  };
  return (data.features ?? []).map((f) => {
    const type = (f.place_type ?? [])[0] ?? "";
    const kind: Place["kind"] =
      type === "address" ? "address" : type === "poi" && /airport|station/i.test(f.text) ? "airport" : "city";
    return {
      id: `mapbox:${f.id}`,
      label: f.place_name,
      kind,
      lat: f.center[1],
      lng: f.center[0],
    };
  });
}

async function googleSearch(query: string, limit: number): Promise<Place[]> {
  const key = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_API_KEY;
  if (!key) return [];
  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("address", query);
  url.searchParams.set("key", key);
  const data = (await fetchJson(url.toString())) as {
    results?: { place_id: string; formatted_address: string; geometry: { location: { lat: number; lng: number } }; types?: string[] }[];
  };
  return (data.results ?? []).slice(0, limit).map((r) => {
    const types = r.types ?? [];
    const kind: Place["kind"] = types.includes("airport")
      ? "airport"
      : types.includes("train_station") || types.includes("transit_station")
        ? "station"
        : types.includes("locality") || types.includes("political")
          ? "city"
          : "address";
    return {
      id: `google:${r.place_id}`,
      label: r.formatted_address,
      kind,
      lat: r.geometry.location.lat,
      lng: r.geometry.location.lng,
    };
  });
}

async function providerSearch(query: string, limit: number): Promise<Place[]> {
  // Skip keyed providers when tokens are unset — do not await empty stubs.
  if (hasMapboxToken()) {
    try {
      const mapbox = await mapboxSearch(query, limit);
      if (mapbox.length) return mapbox;
    } catch {
      /* fall through */
    }
  }
  if (hasGoogleToken()) {
    try {
      const google = await googleSearch(query, limit);
      if (google.length) return google;
    } catch {
      /* fall through */
    }
  }
  return nominatimSearch(query, limit);
}

function withBudget<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch(() => {
        clearTimeout(timer);
        resolve(null);
      });
  });
}

function dedupe(places: Place[]): Place[] {
  const out: Place[] = [];
  for (const place of places) {
    const dup = out.find(
      (p) =>
        p.label.toLowerCase() === place.label.toLowerCase() ||
        (Math.abs(p.lat - place.lat) < 0.0008 && Math.abs(p.lng - place.lng) < 0.0008),
    );
    if (!dup) out.push(place);
  }
  return out;
}

export type SuggestOptions = {
  /** Plane uses the airport IATA seam; car/train stay on Nominatim. */
  mode?: TravelMode;
};

export async function suggestPlaces(query: string, limit = 6, options: SuggestOptions = {}): Promise<Place[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  // TODO(openflights): plane suggest is HARD BLOCK later — only snapshot IATA,
  // no results for OD pairs not in OpenFlights. Car/train stay Nominatim.
  if (options.mode === "plane") {
    return suggestAirports(q, limit);
  }

  const key = `suggest:${options.mode ?? "geo"}:${q.toLowerCase()}:${limit}`;
  const cached = cacheGet(key);
  if (cached) return cached;

  const latlng = parseLatLng(q);
  const local = gazetteerHits(q, limit);
  const seed = [...(latlng ? [latlng] : []), ...local];

  let remote: Place[] = [];
  if (seed.length > 0) {
    // Local hits exist: Nominatim must not sit on the first-response critical path.
    // Wait briefly for a provider; merge if it wins, otherwise return local immediately.
    const raced = await withBudget(providerSearch(q, Math.max(8, limit)), PROVIDER_BUDGET_MS);
    remote = raced ?? [];
  } else {
    try {
      remote = await providerSearch(q, Math.max(8, limit));
    } catch {
      remote = [];
    }
  }

  const merged = dedupe([...seed, ...remote]).slice(0, Math.max(5, limit));
  cacheSet(key, merged);
  return merged;
}

/** Baseline: latlng → gazetteer → Nominatim limit=1 (or Mapbox/Google if keyed). */
export async function geocodeOne(query: string): Promise<Place | null> {
  const q = query.trim();
  if (!q) return null;
  const latlng = parseLatLng(q);
  if (latlng) return latlng;
  const exact = getPlace(q.toLowerCase()) ?? gazetteerHits(q, 1)[0];
  if (exact && (exact.id === q.toLowerCase() || exact.label.toLowerCase() === q.toLowerCase() || exact.label.toLowerCase().startsWith(q.toLowerCase()))) {
    return exact;
  }
  try {
    const [first] = await providerSearch(q, 1);
    return first ?? exact ?? null;
  } catch {
    return exact ?? null;
  }
}
