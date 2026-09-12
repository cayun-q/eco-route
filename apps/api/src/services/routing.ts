import {
  decodePolyline,
  haversineKm,
  mockRoute,
  type LatLng,
  type RouteProvider,
  type TransportMode,
} from "@carbonroute/shared";

export type Routed = {
  distanceKm: number;
  durationMin: number;
  polyline: [number, number][];
  provider: RouteProvider;
};

const MAX_DRIVING_SEGMENT_KM = 80;

function validateDrivingGeometry(route: Routed): Routed {
  if (route.polyline.length < 2) throw new Error("Driving route has no usable geometry");

  for (let i = 1; i < route.polyline.length; i += 1) {
    const [aLat, aLng] = route.polyline[i - 1];
    const [bLat, bLng] = route.polyline[i];
    const gapKm = haversineKm({ lat: aLat, lng: aLng }, { lat: bLat, lng: bLng });
    if (gapKm > MAX_DRIVING_SEGMENT_KM) {
      throw new Error(`Driving geometry contains an implausible ${Math.round(gapKm)} km jump`);
    }
  }

  return route;
}

async function mapboxRoute(origin: LatLng, dest: LatLng): Promise<Routed> {
  const token = process.env.MAPBOX_ACCESS_TOKEN;
  if (!token) throw new Error("MAPBOX_ACCESS_TOKEN missing");
  const url =
    `https://api.mapbox.com/directions/v5/mapbox/driving/` +
    `${origin.lng},${origin.lat};${dest.lng},${dest.lat}` +
    `?geometries=geojson&overview=full&access_token=${encodeURIComponent(token)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Mapbox ${res.status}`);
  const body = (await res.json()) as {
    routes?: Array<{
      distance: number;
      duration: number;
      geometry?: { coordinates?: [number, number][] };
    }>;
  };
  const route = body.routes?.[0];
  if (!route?.geometry?.coordinates?.length) throw new Error("Mapbox empty route");
  return {
    distanceKm: Math.round((route.distance / 1000) * 1000) / 1000,
    durationMin: Math.max(1, Math.round(route.duration / 60)),
    polyline: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
    provider: "mapbox",
  };
}

async function googleRoute(origin: LatLng, dest: LatLng): Promise<Routed> {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) throw new Error("GOOGLE_MAPS_API_KEY missing");
  const url = new URL("https://maps.googleapis.com/maps/api/directions/json");
  url.searchParams.set("origin", `${origin.lat},${origin.lng}`);
  url.searchParams.set("destination", `${dest.lat},${dest.lng}`);
  url.searchParams.set("mode", "driving");
  url.searchParams.set("key", key);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Google ${res.status}`);
  const body = (await res.json()) as {
    status: string;
    routes?: Array<{
      overview_polyline?: { points?: string };
      legs?: Array<{ distance?: { value?: number }; duration?: { value?: number } }>;
    }>;
  };
  const route = body.routes?.[0];
  const encoded = route?.overview_polyline?.points;
  if (body.status !== "OK" || !encoded) throw new Error(`Google ${body.status}`);
  const meters = route?.legs?.reduce((n, leg) => n + (leg.distance?.value ?? 0), 0) ?? 0;
  const seconds = route?.legs?.reduce((n, leg) => n + (leg.duration?.value ?? 0), 0) ?? 0;
  return {
    distanceKm: Math.round((meters / 1000) * 1000) / 1000,
    durationMin: Math.max(1, Math.round(seconds / 60)),
    polyline: decodePolyline(encoded),
    provider: "google",
  };
}

async function orsRoute(origin: LatLng, dest: LatLng): Promise<Routed> {
  const key = process.env.ORS_API_KEY;
  if (!key) throw new Error("ORS_API_KEY missing");
  const res = await fetch("https://api.openrouteservice.org/v2/directions/driving-car/geojson", {
    method: "POST",
    headers: {
      Authorization: key,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      coordinates: [
        [origin.lng, origin.lat],
        [dest.lng, dest.lat],
      ],
    }),
  });
  if (!res.ok) throw new Error(`ORS ${res.status}`);
  const body = (await res.json()) as {
    features?: Array<{
      geometry?: { coordinates?: [number, number][] };
      properties?: { summary?: { distance?: number; duration?: number } };
    }>;
  };
  const feat = body.features?.[0];
  const coords = feat?.geometry?.coordinates;
  if (!coords?.length) throw new Error("ORS empty route");
  const distanceM = feat?.properties?.summary?.distance ?? 0;
  const durationS = feat?.properties?.summary?.duration ?? 0;
  return {
    distanceKm: Math.round((distanceM / 1000) * 1000) / 1000,
    durationMin: Math.max(1, Math.round(durationS / 60)),
    polyline: coords.map(([lng, lat]) => [lat, lng]),
    provider: "ors",
  };
}

async function osrmRoute(origin: LatLng, dest: LatLng): Promise<Routed> {
  const coords = `${origin.lng},${origin.lat};${dest.lng},${dest.lat}`;
  const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "CarbonRoute/1.0",
    },
  });
  if (!res.ok) throw new Error(`OSRM ${res.status}`);
  const body = (await res.json()) as {
    code?: string;
    routes?: Array<{
      distance?: number;
      duration?: number;
      geometry?: { coordinates?: [number, number][] };
    }>;
  };
  const route = body.routes?.[0];
  const coordsOut = route?.geometry?.coordinates;
  if (body.code !== "Ok" || !coordsOut?.length) throw new Error(`OSRM ${body.code ?? "empty route"}`);
  const distanceM = route.distance ?? 0;
  const durationS = route.duration ?? 0;
  return {
    distanceKm: Math.round((distanceM / 1000) * 1000) / 1000,
    durationMin: Math.max(1, Math.round(durationS / 60)),
    polyline: coordsOut.map(([lng, lat]) => [lat, lng]),
    provider: "osrm",
  };
}

export async function routeBetween(
  origin: LatLng,
  dest: LatLng,
  mode: TransportMode,
): Promise<Routed> {
  if (mode === "plane") {
    return { ...mockRoute(origin, dest, mode), provider: "haversine" };
  }

  const attempts: Array<() => Promise<Routed>> = [];
  if (process.env.MAPBOX_ACCESS_TOKEN) attempts.push(() => mapboxRoute(origin, dest));
  if (process.env.GOOGLE_MAPS_API_KEY) attempts.push(() => googleRoute(origin, dest));
  if (process.env.ORS_API_KEY) attempts.push(() => orsRoute(origin, dest));
  attempts.push(() => osrmRoute(origin, dest));

  for (const attempt of attempts) {
    try {
      return validateDrivingGeometry(await attempt());
    } catch (err) {
      console.warn("[routing] provider failed or returned invalid driving geometry, trying next", err);
    }
  }

  throw Object.assign(
    new Error("No drivable route exists between these locations. Try Plane or choose destinations connected by roads."),
    { status: 422 },
  );
}
