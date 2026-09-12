import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Airport, AirportMatch, DistanceResult } from "@/lib/types";

export type { Airport, AirportMatch, DistanceResult };

type Catalog = {
  airports: Airport[];
  byId: Map<number, Airport>;
  byIata: Map<string, Airport>;
  byIcao: Map<string, Airport>;
  routes: Map<string, { airlineCount: number; minStops: number }>;
};

let catalogPromise: Promise<Catalog> | null = null;

const NULLISH = new Set(["", "\\N", "N/A"]);

export function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      fields.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

function clean(value: string | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  if (NULLISH.has(trimmed)) return null;
  return trimmed;
}

export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const earthKm = 6371.0088;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return earthKm * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function airportLabel(airport: Airport): string {
  const code = airport.iata ?? airport.icao ?? String(airport.id);
  return `${code} — ${airport.name}, ${airport.city}, ${airport.country}`;
}

function toMatch(airport: Airport): AirportMatch {
  return { ...airport, label: airportLabel(airport) };
}

function routeKey(fromId: number, toId: number): string {
  return `${fromId}->${toId}`;
}

async function loadCatalog(): Promise<Catalog> {
  const dataDir = path.join(process.cwd(), "data");
  const [airportsRaw, routesRaw] = await Promise.all([
    readFile(path.join(dataDir, "airports.dat"), "utf8"),
    readFile(path.join(dataDir, "routes.dat"), "utf8"),
  ]);

  const airports: Airport[] = [];
  const byId = new Map<number, Airport>();
  const byIata = new Map<string, Airport>();
  const byIcao = new Map<string, Airport>();

  for (const line of airportsRaw.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const cols = parseCsvLine(line);
    const id = Number(cols[0]);
    const latitude = Number(cols[6]);
    const longitude = Number(cols[7]);
    if (!Number.isFinite(id) || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      continue;
    }
    const airport: Airport = {
      id,
      name: clean(cols[1]) ?? "Unknown airport",
      city: clean(cols[2]) ?? "",
      country: clean(cols[3]) ?? "",
      iata: clean(cols[4])?.toUpperCase() ?? null,
      icao: clean(cols[5])?.toUpperCase() ?? null,
      latitude,
      longitude,
    };
    airports.push(airport);
    byId.set(id, airport);
    if (airport.iata) byIata.set(airport.iata, airport);
    if (airport.icao) byIcao.set(airport.icao, airport);
  }

  const routes = new Map<string, { airlineCount: number; minStops: number }>();

  for (const line of routesRaw.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const cols = parseCsvLine(line);
    const sourceId = Number(cols[3]);
    const destId = Number(cols[5]);
    const sourceCode = clean(cols[2])?.toUpperCase();
    const destCode = clean(cols[4])?.toUpperCase();
    const stops = Number(cols[7] ?? 0);
    const minStops = Number.isFinite(stops) ? stops : 0;

    const from =
      (Number.isFinite(sourceId) ? byId.get(sourceId) : undefined) ??
      (sourceCode ? byIata.get(sourceCode) ?? byIcao.get(sourceCode) : undefined);
    const to =
      (Number.isFinite(destId) ? byId.get(destId) : undefined) ??
      (destCode ? byIata.get(destCode) ?? byIcao.get(destCode) : undefined);

    if (!from || !to || from.id === to.id) continue;

    const key = routeKey(from.id, to.id);
    const existing = routes.get(key);
    if (!existing) {
      routes.set(key, { airlineCount: 1, minStops });
    } else {
      existing.airlineCount += 1;
      existing.minStops = Math.min(existing.minStops, minStops);
    }
  }

  return { airports, byId, byIata, byIcao, routes };
}

export function getCatalog(): Promise<Catalog> {
  if (!catalogPromise) {
    catalogPromise = loadCatalog();
  }
  return catalogPromise;
}

function scoreMatch(airport: Airport, query: string): number {
  const q = query.toLowerCase();
  const iata = airport.iata?.toLowerCase() ?? "";
  const icao = airport.icao?.toLowerCase() ?? "";
  const name = airport.name.toLowerCase();
  const city = airport.city.toLowerCase();
  const looksLikeCode = /^[a-z0-9]{2,4}$/i.test(query.trim());
  if (iata === q || icao === q) return 100;
  if (iata.startsWith(q) || icao.startsWith(q)) return 80;
  if (name.startsWith(q) || city.startsWith(q)) return 60;
  if (!looksLikeCode && (name.includes(q) || city.includes(q))) return 40;
  if (!looksLikeCode && q.length >= 4 && airport.country.toLowerCase().includes(q)) {
    return 10;
  }
  return 0;
}

export async function searchAirports(query: string, limit = 8): Promise<AirportMatch[]> {
  const q = query.trim();
  if (q.length < 1) return [];
  const { airports } = await getCatalog();
  return airports
    .map((airport) => ({ airport, score: scoreMatch(airport, q) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || a.airport.name.localeCompare(b.airport.name))
    .slice(0, limit)
    .map((row) => toMatch(row.airport));
}

export function resolveAirport(catalog: Catalog, query: string): Airport | null {
  const q = query.trim();
  if (!q) return null;
  const upper = q.toUpperCase();
  const exact = catalog.byIata.get(upper) ?? catalog.byIcao.get(upper);
  if (exact) return exact;

  const matches = catalog.airports.filter((airport) => scoreMatch(airport, q) >= 40);
  matches.sort((a, b) => scoreMatch(b, q) - scoreMatch(a, q));
  if (matches.length === 0) return null;
  if (matches.length === 1) return matches[0];
  const top = matches[0];
  if (scoreMatch(top, q) === 100) return top;
  const nameExact = matches.find(
    (airport) => airport.name.toLowerCase() === q.toLowerCase(),
  );
  return nameExact ?? top;
}

export async function calculateIfConnected(
  fromQuery: string,
  toQuery: string,
): Promise<DistanceResult> {
  const catalog = await getCatalog();
  const from = resolveAirport(catalog, fromQuery);
  if (!from) return { status: "unknown", query: fromQuery, which: "from" };
  const to = resolveAirport(catalog, toQuery);
  if (!to) return { status: "unknown", query: toQuery, which: "to" };
  if (from.id === to.id) return { status: "same-airport", airport: toMatch(from) };

  const route = catalog.routes.get(routeKey(from.id, to.id));
  if (!route) {
    return {
      status: "ok",
      from: toMatch(from),
      to: toMatch(to),
      connected: false,
      km: null,
      miles: null,
      airlineCount: 0,
      stops: null,
    };
  }

  const km = haversineKm(from.latitude, from.longitude, to.latitude, to.longitude);
  return {
    status: "ok",
    from: toMatch(from),
    to: toMatch(to),
    connected: true,
    km,
    miles: km * 0.621371,
    airlineCount: route.airlineCount,
    stops: route.minStops,
  };
}
