import type { Place } from "./types";

const rawPlaces: Place[] = [
  { id: "sf", label: "San Francisco", kind: "city", lat: 37.7749, lng: -122.4194, region: "US" },
  { id: "oak", label: "Oakland", kind: "city", lat: 37.8044, lng: -122.2712, region: "US" },
  { id: "sjc-city", label: "San Jose", kind: "city", lat: 37.3382, lng: -121.8863, region: "US" },
  { id: "sfo", label: "SFO", kind: "airport", lat: 37.6213, lng: -122.379, region: "US" },
  { id: "oak-apt", label: "OAK", kind: "airport", lat: 37.7126, lng: -122.2197, region: "US" },
  { id: "sjc", label: "SJC", kind: "airport", lat: 37.3639, lng: -121.9289, region: "US" },
  { id: "lax-city", label: "Los Angeles", kind: "city", lat: 34.0522, lng: -118.2437, region: "US" },
  { id: "lax", label: "LAX", kind: "airport", lat: 33.9416, lng: -118.4085, region: "US" },
  { id: "nyc", label: "New York", kind: "city", lat: 40.7128, lng: -74.006, region: "US" },
  { id: "manhattan", label: "Manhattan", kind: "city", lat: 40.7831, lng: -73.9712, region: "US" },
  { id: "brooklyn", label: "Brooklyn", kind: "city", lat: 40.6782, lng: -73.9442, region: "US" },
  { id: "jfk", label: "JFK", kind: "airport", lat: 40.6413, lng: -73.7781, region: "US" },
  { id: "lga", label: "LGA", kind: "airport", lat: 40.7769, lng: -73.874, region: "US" },
  { id: "ewr", label: "EWR", kind: "airport", lat: 40.6895, lng: -74.1745, region: "US" },
  { id: "chi", label: "Chicago", kind: "city", lat: 41.8781, lng: -87.6298, region: "US" },
  { id: "ord", label: "ORD", kind: "airport", lat: 41.9742, lng: -87.9073, region: "US" },
  { id: "mdw", label: "MDW", kind: "airport", lat: 41.7868, lng: -87.7522, region: "US" },
  { id: "bos-city", label: "Boston", kind: "city", lat: 42.3601, lng: -71.0589, region: "US" },
  { id: "bos", label: "BOS", kind: "airport", lat: 42.3656, lng: -71.0096, region: "US" },
  { id: "sea-city", label: "Seattle", kind: "city", lat: 47.6062, lng: -122.3321, region: "US" },
  { id: "sea", label: "SEA", kind: "airport", lat: 47.4502, lng: -122.3088, region: "US" },
  { id: "den-city", label: "Denver", kind: "city", lat: 39.7392, lng: -104.9903, region: "US" },
  { id: "den", label: "DEN", kind: "airport", lat: 39.8561, lng: -104.6737, region: "US" },
  { id: "mia-city", label: "Miami", kind: "city", lat: 25.7617, lng: -80.1918, region: "US" },
  { id: "mia", label: "MIA", kind: "airport", lat: 25.7959, lng: -80.287, region: "US" },
  { id: "dc", label: "Washington, DC", kind: "city", lat: 38.9072, lng: -77.0369, region: "US" },
  { id: "dca", label: "DCA", kind: "airport", lat: 38.8512, lng: -77.0402, region: "US" },
  { id: "iad", label: "IAD", kind: "airport", lat: 38.9531, lng: -77.4565, region: "US" },
  { id: "aus-city", label: "Austin", kind: "city", lat: 30.2672, lng: -97.7431, region: "US" },
  { id: "aus", label: "AUS", kind: "airport", lat: 30.1945, lng: -97.6699, region: "US" },
  { id: "pdx-city", label: "Portland", kind: "city", lat: 45.5152, lng: -122.6784, region: "US" },
  { id: "pdx", label: "PDX", kind: "airport", lat: 45.5898, lng: -122.5951, region: "US" },
  { id: "lon", label: "London", kind: "city", lat: 51.5074, lng: -0.1278, region: "UK" },
  { id: "lhr", label: "LHR", kind: "airport", lat: 51.47, lng: -0.4543, region: "UK" },
  { id: "lgw", label: "LGW", kind: "airport", lat: 51.1537, lng: -0.1821, region: "UK" },
  { id: "stn", label: "STN", kind: "airport", lat: 51.886, lng: 0.2389, region: "UK" },
  { id: "stpancras", label: "London St Pancras", kind: "station", lat: 51.5322, lng: -0.1269, region: "UK" },
  { id: "man-city", label: "Manchester", kind: "city", lat: 53.4808, lng: -2.2426, region: "UK" },
  { id: "man", label: "MAN", kind: "airport", lat: 53.365, lng: -2.2727, region: "UK" },
  { id: "edi-city", label: "Edinburgh", kind: "city", lat: 55.9533, lng: -3.1883, region: "UK" },
  { id: "edi", label: "EDI", kind: "airport", lat: 55.9508, lng: -3.3615, region: "UK" },
  { id: "par", label: "Paris", kind: "city", lat: 48.8566, lng: 2.3522, region: "FR" },
  { id: "cdg", label: "CDG", kind: "airport", lat: 49.0097, lng: 2.5479, region: "FR" },
  { id: "ory", label: "ORY", kind: "airport", lat: 48.7233, lng: 2.3794, region: "FR" },
  { id: "gdn", label: "Paris Gare du Nord", kind: "station", lat: 48.8809, lng: 2.3553, region: "FR" },
  { id: "ams-city", label: "Amsterdam", kind: "city", lat: 52.3676, lng: 4.9041, region: "NL" },
  { id: "ams", label: "AMS", kind: "airport", lat: 52.3105, lng: 4.7683, region: "NL" },
  { id: "ber-city", label: "Berlin", kind: "city", lat: 52.52, lng: 13.405, region: "DE" },
  { id: "ber", label: "BER", kind: "airport", lat: 52.3667, lng: 13.5033, region: "DE" },
  { id: "fra-city", label: "Frankfurt", kind: "city", lat: 50.1109, lng: 8.6821, region: "DE" },
  { id: "fra", label: "FRA", kind: "airport", lat: 50.0379, lng: 8.5622, region: "DE" },
  { id: "mad-city", label: "Madrid", kind: "city", lat: 40.4168, lng: -3.7038, region: "ES" },
  { id: "mad", label: "MAD", kind: "airport", lat: 40.4983, lng: -3.5676, region: "ES" },
  { id: "bcn-city", label: "Barcelona", kind: "city", lat: 41.3874, lng: 2.1686, region: "ES" },
  { id: "bcn", label: "BCN", kind: "airport", lat: 41.2974, lng: 2.0833, region: "ES" },
  { id: "rom", label: "Rome", kind: "city", lat: 41.9028, lng: 12.4964, region: "IT" },
  { id: "fco", label: "FCO", kind: "airport", lat: 41.8003, lng: 12.2389, region: "IT" },
  { id: "yyz-city", label: "Toronto", kind: "city", lat: 43.6532, lng: -79.3832, region: "CA" },
  { id: "yyz", label: "YYZ", kind: "airport", lat: 43.6777, lng: -79.6248, region: "CA" },
  { id: "yvr-city", label: "Vancouver", kind: "city", lat: 49.2827, lng: -123.1207, region: "CA" },
  { id: "yvr", label: "YVR", kind: "airport", lat: 49.1947, lng: -123.1792, region: "CA" },
  { id: "tyo", label: "Tokyo", kind: "city", lat: 35.6762, lng: 139.6503, region: "JP" },
  { id: "hnd", label: "HND", kind: "airport", lat: 35.5494, lng: 139.7798, region: "JP" },
  { id: "nrt", label: "NRT", kind: "airport", lat: 35.772, lng: 140.3929, region: "JP" },
  { id: "sin-city", label: "Singapore", kind: "city", lat: 1.3521, lng: 103.8198, region: "SG" },
  { id: "sin", label: "SIN", kind: "airport", lat: 1.3644, lng: 103.9915, region: "SG" },
  { id: "dxb-city", label: "Dubai", kind: "city", lat: 25.2048, lng: 55.2708, region: "AE" },
  { id: "dxb", label: "DXB", kind: "airport", lat: 25.2532, lng: 55.3657, region: "AE" },
  { id: "syd-city", label: "Sydney", kind: "city", lat: 33.8688, lng: 151.2093, region: "AU" },
  { id: "syd", label: "SYD", kind: "airport", lat: -33.9399, lng: 151.1753, region: "AU" },
];

/** Gazetteer airports already use IATA as the label — stamp `iata` so plane legs are swap-ready. */
export const places: Place[] = rawPlaces.map((place) =>
  place.kind === "airport" && /^[A-Z]{3}$/.test(place.label) ? { ...place, iata: place.label } : place,
);

const byId = new Map(places.map((p) => [p.id, p]));

export function getPlace(id: string): Place | undefined {
  return byId.get(id);
}

export function searchPlaces(query: string, limit = 8): Place[] {
  const q = query.trim().toLowerCase();
  if (!q) return places.slice(0, limit);
  const scored = places
    .map((p) => {
      const label = p.label.toLowerCase();
      const id = p.id.toLowerCase();
      const region = (p.region ?? "").toLowerCase();
      const iata = (p.iata ?? "").toLowerCase();
      let score = 0;
      if (id === q || label === q || iata === q) score = 100;
      else if (label.startsWith(q) || id.startsWith(q) || iata.startsWith(q)) score = 80;
      else if (label.includes(q) || id.includes(q) || region === q || iata.includes(q)) score = 40;
      return { p, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.p.label.localeCompare(b.p.label));
  return scored.slice(0, limit).map((x) => x.p);
}

/** Airports near a city hit — used by the plane IATA picker until OpenFlights lands. */
export function airportsNear(city: Place, maxDeg = 1.15): Place[] {
  return places.filter((place) => {
    if (place.kind !== "airport") return false;
    const dLat = place.lat - city.lat;
    const dLng = place.lng - city.lng;
    return dLat * dLat + dLng * dLng <= maxDeg * maxDeg;
  });
}

export function searchAirports(query: string, limit = 8): Place[] {
  const hits = searchPlaces(query, 24);
  const direct = hits.filter((place) => place.kind === "airport" || place.iata);
  const nearby = hits.filter((place) => place.kind === "city").flatMap((city) => airportsNear(city));
  const seen = new Set<string>();
  const out: Place[] = [];
  for (const place of [...direct, ...nearby]) {
    if (seen.has(place.id)) continue;
    seen.add(place.id);
    out.push(place);
    if (out.length >= limit) break;
  }
  return out;
}
