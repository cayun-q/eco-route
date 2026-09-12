import { lookupGazetteer, parseLatLng, type Place } from "@carbonroute/shared";

const cache = new Map<string, Place>();
const searchCache = new Map<string, { expiresAt: number; places: Place[] }>();
const SEARCH_TTL_MS = 5 * 60 * 1000;

export class GeocodeError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

function normalizeWords(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function phraseMatches(query: string, candidate: string): boolean {
  const q = normalizeWords(query);
  const c = normalizeWords(candidate);
  if (!q || !c) return false;
  return c === q || c.startsWith(`${q} `) || c.includes(` ${q} `) || c.endsWith(` ${q}`);
}

async function nominatim(query: string): Promise<Place | null> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  url.searchParams.set("addressdetails", "1");
  const res = await fetch(url, {
    headers: {
      "User-Agent": "CarbonRoute/1.0 (trip carbon ledger)",
      Accept: "application/json",
    },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as Array<{
    lat: string;
    lon: string;
    display_name: string;
  }>;
  const hit = data[0];
  if (!hit) return null;
  return {
    label: hit.display_name,
    lat: Number(hit.lat),
    lng: Number(hit.lon),
  };
}

export async function searchPlaces(query: string, limit = 6): Promise<Place[]> {
  const trimmed = query.trim();
  if (trimmed.length < 3) return [];

  const key = normalizeWords(trimmed);
  const cachedSearch = searchCache.get(key);
  if (cachedSearch && cachedSearch.expiresAt > Date.now()) return cachedSearch.places;

  const local = lookupGazetteer(trimmed);
  const places: Place[] = local && phraseMatches(trimmed, local.label) ? [local] : [];

  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", trimmed);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("limit", String(Math.min(10, Math.max(limit * 2, 6))));
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("dedupe", "1");
    const res = await fetch(url, {
      headers: {
        "User-Agent": "CarbonRoute/1.0 (trip carbon ledger)",
        Accept: "application/json",
      },
    });
    if (res.ok) {
      const data = (await res.json()) as Array<{
        lat: string;
        lon: string;
        display_name: string;
      }>;
      for (const hit of data) {
        if (!phraseMatches(trimmed, hit.display_name)) continue;
        const place: Place = {
          label: hit.display_name,
          lat: Number(hit.lat),
          lng: Number(hit.lon),
        };
        if (!Number.isFinite(place.lat) || !Number.isFinite(place.lng)) continue;
        if (places.some((p) => normalizeWords(p.label) === normalizeWords(place.label))) continue;
        places.push(place);
        cache.set(normalizeWords(place.label), place);
        if (places.length >= limit) break;
      }
    }
  } catch {
    // Search suggestions are optional; local gazetteer results still work.
  }

  const result = places.slice(0, limit);
  searchCache.set(key, { expiresAt: Date.now() + SEARCH_TTL_MS, places: result });
  return result;
}

export async function geocode(query: string): Promise<Place> {
  const key = normalizeWords(query);
  const cached = cache.get(key);
  if (cached) return cached;

  const coords = parseLatLng(query);
  if (coords) {
    const place = { ...coords, label: query.trim() };
    cache.set(key, place);
    return place;
  }

  const local = lookupGazetteer(query);
  if (local) {
    cache.set(key, local);
    return local;
  }

  try {
    const remote = await nominatim(query);
    if (remote) {
      cache.set(key, remote);
      cache.set(normalizeWords(remote.label), remote);
      return remote;
    }
  } catch {
    // Nominatim is optional; gazetteer + lat,lng still work offline.
  }

  throw new GeocodeError(
    `Could not place "${query.trim()}". Try a street address, city name, or lat,lng.`,
    422,
  );
}
