import cors from "cors";
import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import { searchPlaces } from "@carbonroute/shared";
import { pool, query } from "./db.js";
import { estimateItinerary } from "./estimate.js";
import { suggestAirports } from "./airports.js";
import { geocodeOne, suggestPlaces } from "./geocode.js";
import { migrate } from "./migrate.js";
import { createTrip, getTrip, listTrips } from "./trips.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

function asyncHandler(
  fn: (req: express.Request, res: express.Response) => Promise<void>,
): express.RequestHandler {
  return (req, res, next) => {
    fn(req, res).catch(next);
  };
}

app.get("/health", asyncHandler(async (_req, res) => {
  await query("SELECT 1");
  res.json({ ok: true, service: "carbonroute-api" });
}));

app.get("/factors", asyncHandler(async (_req, res) => {
  const { rows } = await query(
    `SELECT id, mode, band, activity, kg_co2e_per_km::float8 AS "kgCo2ePerKm", unit, source, year
     FROM emission_factors ORDER BY id`,
  );
  res.json({ factors: rows });
}));

app.get("/places", (req, res) => {
  const q = typeof req.query.q === "string" ? req.query.q : "";
  res.json({ places: searchPlaces(q, 12) });
});

function readQuery(req: express.Request): { q: string; mode?: "car" | "plane" | "train" } {
  const q =
    typeof req.query.q === "string"
      ? req.query.q
      : typeof req.body?.q === "string"
        ? req.body.q
        : "";
  const raw =
    typeof req.query.mode === "string"
      ? req.query.mode
      : typeof req.body?.mode === "string"
        ? req.body.mode
        : undefined;
  const mode = raw === "car" || raw === "plane" || raw === "train" ? raw : undefined;
  return { q, mode };
}

async function handleSuggest(req: express.Request, res: express.Response) {
  const { q, mode } = readQuery(req);
  // Plane: airport IATA seam. Car/train: Nominatim + gazetteer.
  const places = await suggestPlaces(q, 6, { mode });
  const keyed = process.env.MAPBOX_TOKEN || process.env.MAPBOX_ACCESS_TOKEN ? "mapbox" : process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_API_KEY ? "google" : "nominatim";
  res.json({ places, provider: mode === "plane" ? "airports" : keyed });
}

async function handleAirportSuggest(req: express.Request, res: express.Response) {
  const { q } = readQuery(req);
  // TODO(openflights): replace gazetteer-backed suggestAirports + add connect-check HARD BLOCK.
  res.json({ places: suggestAirports(q, 6), provider: "gazetteer-iata" });
}

app.get("/api/geocode/suggest", asyncHandler(handleSuggest));
app.post("/api/geocode/suggest", asyncHandler(handleSuggest));
app.get("/geocode/suggest", asyncHandler(handleSuggest));
app.post("/geocode/suggest", asyncHandler(handleSuggest));

async function handleGeocode(req: express.Request, res: express.Response) {
  const q = typeof req.query.q === "string" ? req.query.q : "";
  const place = await geocodeOne(q);
  if (!place) {
    res.status(404).json({ error: "No geocode match" });
    return;
  }
  res.json({ place });
}

app.get("/api/geocode", asyncHandler(handleGeocode));
app.get("/geocode", asyncHandler(handleGeocode));

app.get("/api/airports/suggest", asyncHandler(handleAirportSuggest));
app.post("/api/airports/suggest", asyncHandler(handleAirportSuggest));

app.post(
  "/estimate",
  asyncHandler(async (req, res) => {
    const estimate = await estimateItinerary(req.body);
    res.json(estimate);
  }),
);

app.get(
  "/trips",
  asyncHandler(async (_req, res) => {
    res.json({ trips: await listTrips() });
  }),
);

app.get(
  "/trips/:id",
  asyncHandler(async (req, res) => {
    const trip = await getTrip(req.params.id);
    if (!trip) {
      res.status(404).json({ error: "Trip not found" });
      return;
    }
    res.json(trip);
  }),
);

app.post(
  "/trips",
  asyncHandler(async (req, res) => {
    const trip = await createTrip(req.body);
    res.status(201).json(trip);
  }),
);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const status = typeof err === "object" && err && "status" in err ? Number(err.status) || 500 : 500;
  const message = err instanceof Error ? err.message : "Server error";
  res.status(status).json({ error: message });
});

const expoProxy = process.env.EXPO_WEB_PROXY;
if (expoProxy) {
  app.use(
    createProxyMiddleware({
      target: expoProxy,
      changeOrigin: true,
      ws: true,
    }),
  );
}

const port = Number(process.env.API_PORT ?? 47832);

async function main() {
  await migrate();
  await new Promise<void>((resolve) => {
    app.listen(port, "0.0.0.0", () => resolve());
  });
  console.log(`CarbonRoute API on http://127.0.0.1:${port}`);
  if (expoProxy) console.log(`Proxying Expo web from ${expoProxy}`);
}

main().catch(async (err) => {
  console.error(err);
  await pool.end();
  process.exit(1);
});
