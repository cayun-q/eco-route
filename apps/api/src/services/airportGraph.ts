import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { haversineKm, type Place } from "@carbonroute/shared";

const execFileAsync = promisify(execFile);

export type Airport = {
  id: number;
  name: string;
  city: string;
  country: string;
  iata: string;
  lat: number;
  lng: number;
};

type Catalog = {
  airports: Airport[];
  byId: Map<number, Airport>;
  byIata: Map<string, Airport>;
  adjacency: Map<number, number[]>;
};

let catalogPromise: Promise<Catalog> | null = null;

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else if (ch === '"') {
        quoted = false;
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      quoted = true;
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
  const v = value?.trim();
  return !v || v === "\\N" ? null : v;
}

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const DATA_BRANCH = "origin/cursor/connecting-flight-distance";

async function readSnapshotFile(name: "airports.dat" | "routes.dat"): Promise<string> {
  const candidates = [
    path.join(repoRoot, "data", name),
    path.join(repoRoot, "apps", "api", "data", name),
  ];
  for (const candidate of candidates) {
    try {
      return await readFile(candidate, "utf8");
    } catch {
      // Try the next source.
    }
  }

  try {
    const { stdout } = await execFileAsync(
      "git",
      ["show", `${DATA_BRANCH}:data/${name}`],
      { cwd: repoRoot, maxBuffer: 12 * 1024 * 1024 },
    );
    return stdout;
  } catch {
    throw Object.assign(
      new Error(
        `Airport data is unavailable. Run "git fetch origin cursor/connecting-flight-distance" once, then retry.`,
      ),
      { status: 503 },
    );
  }
}

async function loadCatalog(): Promise<Catalog> {
  const [airportsRaw, routesRaw] = await Promise.all([
    readSnapshotFile("airports.dat"),
    readSnapshotFile("routes.dat"),
  ]);

  const airports: Airport[] = [];
  const byId = new Map<number, Airport>();
  const byIata = new Map<string, Airport>();

  for (const line of airportsRaw.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const c = parseCsvLine(line);
    const id = Number(c[0]);
    const lat = Number(c[6]);
    const lng = Number(c[7]);
    const iata = clean(c[4])?.toUpperCase();
    const type = clean(c[12]);
    if (!Number.isFinite(id) || !Number.isFinite(lat) || !Number.isFinite(lng) || !iata) continue;
    if (type && type !== "airport") continue;
    const airport: Airport = {
      id,
      name: clean(c[1]) ?? iata,
      city: clean(c[2]) ?? "",
      country: clean(c[3]) ?? "",
      iata,
      lat,
      lng,
    };
    airports.push(airport);
    byId.set(id, airport);
    byIata.set(iata, airport);
  }

  const adjacencySets = new Map<number, Set<number>>();
  for (const line of routesRaw.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const c = parseCsvLine(line);
    const sourceId = Number(c[3]);
    const destId = Number(c[5]);
    const sourceCode = clean(c[2])?.toUpperCase();
    const destCode = clean(c[4])?.toUpperCase();
    const from = (Number.isFinite(sourceId) ? byId.get(sourceId) : undefined) ?? (sourceCode ? byIata.get(sourceCode) : undefined);
    const to = (Number.isFinite(destId) ? byId.get(destId) : undefined) ?? (destCode ? byIata.get(destCode) : undefined);
    if (!from || !to || from.id === to.id) continue;
    const set = adjacencySets.get(from.id) ?? new Set<number>();
    set.add(to.id);
    adjacencySets.set(from.id, set);
  }

  const adjacency = new Map<number, number[]>();
  for (const [id, set] of adjacencySets) adjacency.set(id, [...set]);
  return { airports, byId, byIata, adjacency };
}

function getCatalog(): Promise<Catalog> {
  catalogPromise ??= loadCatalog();
  return catalogPromise;
}

function nearestAirports(catalog: Catalog, place: Place, limit = 8): Array<{ airport: Airport; km: number }> {
  return catalog.airports
    .filter((a) => (catalog.adjacency.get(a.id)?.length ?? 0) > 0)
    .map((airport) => ({ airport, km: haversineKm(place, airport) }))
    .sort((a, b) => a.km - b.km)
    .slice(0, limit);
}

function bfs(catalog: Catalog, start: number, goal: number, maxFlightLegs = 4): number[] | null {
  if (start === goal) return null;
  const queue: number[][] = [[start]];
  const bestDepth = new Map<number, number>([[start, 0]]);
  while (queue.length) {
    const pathIds = queue.shift()!;
    const current = pathIds[pathIds.length - 1];
    const depth = pathIds.length - 1;
    if (depth >= maxFlightLegs) continue;
    for (const next of catalog.adjacency.get(current) ?? []) {
      const nextPath = [...pathIds, next];
      if (next === goal) return nextPath;
      const nextDepth = depth + 1;
      if ((bestDepth.get(next) ?? Infinity) <= nextDepth) continue;
      bestDepth.set(next, nextDepth);
      queue.push(nextPath);
    }
  }
  return null;
}

export async function lookupAirportByIata(code: string): Promise<Airport | null> {
  const normalized = code.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(normalized)) return null;
  return (await getCatalog()).byIata.get(normalized) ?? null;
}

export async function findFlightPlan(origin: Place, destination: Place): Promise<Airport[]> {
  const catalog = await getCatalog();
  const origins = nearestAirports(catalog, origin, 8);
  const destinations = nearestAirports(catalog, destination, 8);

  let best: { path: Airport[]; score: number } | null = null;
  for (const o of origins) {
    for (const d of destinations) {
      const ids = bfs(catalog, o.airport.id, d.airport.id, 4);
      if (!ids || ids.length < 2) continue;
      const airports = ids.map((id) => catalog.byId.get(id)).filter((a): a is Airport => Boolean(a));
      if (airports.length !== ids.length) continue;
      let airKm = 0;
      for (let i = 0; i < airports.length - 1; i += 1) airKm += haversineKm(airports[i], airports[i + 1]);
      const flightLegs = airports.length - 1;
      const score = flightLegs * 100000 + (o.km + d.km) * 100 + airKm;
      if (!best || score < best.score) best = { path: airports, score };
    }
  }

  if (!best) {
    throw Object.assign(new Error("No usable airport connection was found for this trip."), { status: 422 });
  }
  return best.path;
}

export function airportPlace(airport: Airport): Place {
  return {
    label: `${airport.iata} — ${airport.name}, ${airport.city}`,
    lat: airport.lat,
    lng: airport.lng,
  };
}
