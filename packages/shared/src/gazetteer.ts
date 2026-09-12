import { mockRoute, parseLatLng } from "./geo";
import type { Place, RouteEstimate, TransportMode } from "./types";

/** Offline / no-key geocoder for common city names used in demos and tests. */
export const GAZETTEER: Place[] = [
  { label: "Portland, OR", lat: 45.5152, lng: -122.6784 },
  { label: "Seattle, WA", lat: 47.6062, lng: -122.3321 },
  { label: "San Francisco, CA", lat: 37.7749, lng: -122.4194 },
  { label: "Los Angeles, CA", lat: 34.0522, lng: -118.2437 },
  { label: "San Diego, CA", lat: 32.7157, lng: -117.1611 },
  { label: "Sacramento, CA", lat: 38.5816, lng: -121.4944 },
  { label: "New York, NY", lat: 40.7128, lng: -74.006 },
  { label: "Boston, MA", lat: 42.3601, lng: -71.0589 },
  { label: "Chicago, IL", lat: 41.8781, lng: -87.6298 },
  { label: "Denver, CO", lat: 39.7392, lng: -104.9903 },
  { label: "Austin, TX", lat: 30.2672, lng: -97.7431 },
  { label: "Dallas, TX", lat: 32.7767, lng: -96.797 },
  { label: "Houston, TX", lat: 29.7604, lng: -95.3698 },
  { label: "Miami, FL", lat: 25.7617, lng: -80.1918 },
  { label: "Atlanta, GA", lat: 33.749, lng: -84.388 },
  { label: "Washington, DC", lat: 38.9072, lng: -77.0369 },
  { label: "Philadelphia, PA", lat: 39.9526, lng: -75.1652 },
  { label: "Phoenix, AZ", lat: 33.4484, lng: -112.074 },
  { label: "Salt Lake City, UT", lat: 40.7608, lng: -111.891 },
  { label: "Minneapolis, MN", lat: 44.9778, lng: -93.265 },
  { label: "Detroit, MI", lat: 42.3314, lng: -83.0458 },
  { label: "Vancouver, BC", lat: 49.2827, lng: -123.1207 },
  { label: "Toronto, ON", lat: 43.6532, lng: -79.3832 },
  { label: "Montreal, QC", lat: 45.5017, lng: -73.5673 },
  { label: "London, UK", lat: 51.5074, lng: -0.1278 },
  { label: "Manchester, UK", lat: 53.4808, lng: -2.2426 },
  { label: "Edinburgh, UK", lat: 55.9533, lng: -3.1883 },
  { label: "Paris, France", lat: 48.8566, lng: 2.3522 },
  { label: "Berlin, Germany", lat: 52.52, lng: 13.405 },
  { label: "Amsterdam, Netherlands", lat: 52.3676, lng: 4.9041 },
  { label: "Brussels, Belgium", lat: 50.8503, lng: 4.3517 },
  { label: "Madrid, Spain", lat: 40.4168, lng: -3.7038 },
  { label: "Barcelona, Spain", lat: 41.3874, lng: 2.1686 },
  { label: "Rome, Italy", lat: 41.9028, lng: 12.4964 },
  { label: "Milan, Italy", lat: 45.4642, lng: 9.19 },
  { label: "Zurich, Switzerland", lat: 47.3769, lng: 8.5417 },
  { label: "Vienna, Austria", lat: 48.2082, lng: 16.3738 },
  { label: "Prague, Czechia", lat: 50.0755, lng: 14.4378 },
  { label: "Copenhagen, Denmark", lat: 55.6761, lng: 12.5683 },
  { label: "Stockholm, Sweden", lat: 59.3293, lng: 18.0686 },
  { label: "Oslo, Norway", lat: 59.9139, lng: 10.7522 },
  { label: "Dublin, Ireland", lat: 53.3498, lng: -6.2603 },
  { label: "Lisbon, Portugal", lat: 38.7223, lng: -9.1393 },
  { label: "Tokyo, Japan", lat: 35.6762, lng: 139.6503 },
  { label: "Osaka, Japan", lat: 34.6937, lng: 135.5023 },
  { label: "Seoul, South Korea", lat: 37.5665, lng: 126.978 },
  { label: "Beijing, China", lat: 39.9042, lng: 116.4074 },
  { label: "Shanghai, China", lat: 31.2304, lng: 121.4737 },
  { label: "Hong Kong", lat: 22.3193, lng: 114.1694 },
  { label: "Singapore", lat: 1.3521, lng: 103.8198 },
  { label: "Sydney, Australia", lat: -33.8688, lng: 151.2093 },
  { label: "Melbourne, Australia", lat: -37.8136, lng: 144.9631 },
  { label: "Auckland, New Zealand", lat: -36.8509, lng: 174.7645 },
  { label: "Mexico City, Mexico", lat: 19.4326, lng: -99.1332 },
  { label: "São Paulo, Brazil", lat: -23.5558, lng: -46.6396 },
  { label: "Buenos Aires, Argentina", lat: -34.6037, lng: -58.3816 },
  { label: "Cape Town, South Africa", lat: -33.9249, lng: 18.4241 },
  { label: "Nairobi, Kenya", lat: -1.2921, lng: 36.8219 },
  { label: "Mumbai, India", lat: 19.076, lng: 72.8777 },
  { label: "Delhi, India", lat: 28.6139, lng: 77.209 },
];

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[.,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function lookupGazetteer(query: string): Place | null {
  const q = normalize(query);
  if (!q) return null;

  const coords = parseLatLng(query);
  if (coords) return { ...coords, label: query.trim() };

  const exact = GAZETTEER.find((p) => normalize(p.label) === q);
  if (exact) return exact;

  const starts = GAZETTEER.filter(
    (p) => normalize(p.label).startsWith(q) || q.startsWith(normalize(p.label).split(",")[0]),
  );
  if (starts.length === 1) return starts[0];

  const city = q.split(",")[0].trim();
  const cityHits = GAZETTEER.filter((p) => normalize(p.label).split(",")[0] === city);
  if (cityHits.length === 1) return cityHits[0];
  if (cityHits.length > 1) {
    const withRegion = cityHits.find((p) => normalize(p.label).includes(q));
    if (withRegion) return withRegion;
    return cityHits[0];
  }

  const contains = GAZETTEER.filter(
    (p) => normalize(p.label).includes(q) || q.includes(normalize(p.label).split(",")[0]),
  );
  return contains[0] ?? null;
}

export function lookupOfflineEstimate(
  originQ: string,
  destQ: string,
  mode: TransportMode,
): Pick<RouteEstimate, "origin" | "destination" | "distanceKm" | "durationMin" | "polyline"> {
  const origin = lookupGazetteer(originQ);
  const destination = lookupGazetteer(destQ);
  if (!origin || !destination) {
    throw new Error("Could not place both ends from the offline gazetteer.");
  }
  const routed = mockRoute(origin, destination, mode);
  return { origin, destination, ...routed };
}
