import { lookupGazetteer, parseLatLng, type Place } from "@carbonroute/shared";

const cache = new Map<string, Place>();

export class GeocodeError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

async function nominatim(query: string): Promise<Place | null> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
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

export async function geocode(query: string): Promise<Place> {
  const key = query.trim().toLowerCase();
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
      return remote;
    }
  } catch {
    // Nominatim is optional; gazetteer + lat,lng still work offline.
  }

  throw new GeocodeError(
    `Could not place "${query.trim()}". Try a city name (Portland, OR) or lat,lng.`,
    422,
  );
}
