import { Router } from "express";
import { z } from "zod";
import { MODES } from "@carbonroute/shared";
import { pool } from "../db";

export const tripsRouter = Router();

const placeSchema = z.object({
  label: z.string().min(1).max(300),
  lat: z.number().gte(-90).lte(90),
  lng: z.number().gte(-180).lte(180),
});

const legSchema = z.object({
  mode: z.enum(MODES),
  origin: placeSchema,
  destination: placeSchema,
  distanceKm: z.number().nonnegative(),
  durationMin: z.number().int().nonnegative(),
  polyline: z.array(z.tuple([z.number(), z.number()])).min(2),
  provider: z.enum(["haversine", "mapbox", "google", "ors", "osrm", "openflights", "estimated"]),
  summary: z.string().max(300).optional(),
});

const tripBody = z.object({
  originLabel: z.string().min(1).max(300),
  destinationLabel: z.string().min(1).max(300),
  originLat: z.number().gte(-90).lte(90),
  originLng: z.number().gte(-180).lte(180),
  destLat: z.number().gte(-90).lte(90),
  destLng: z.number().gte(-180).lte(180),
  mode: z.enum(MODES),
  logMethod: z.enum(["automatic", "manual"]).optional().default("automatic"),
  distanceKm: z.number().nonnegative(),
  durationMin: z.number().int().nonnegative(),
  co2eKg: z.number().nonnegative(),
  polyline: z.array(z.tuple([z.number(), z.number()])).min(2),
  legs: z.array(legSchema).optional(),
  factorGPerKm: z.number().nonnegative(),
  factorSource: z.string().min(1),
});

function clientId(req: { get(name: string): string | undefined }): string | null {
  const value = req.get("x-luma-client-id")?.trim();
  return value && value.length >= 8 && value.length <= 128 ? value : null;
}

function requireClientId(req: { get(name: string): string | undefined }, res: { status(code: number): { json(body: unknown): unknown } }): string | null {
  const id = clientId(req);
  if (!id) res.status(400).json({ error: "Missing or invalid Luma client identifier." });
  return id;
}

function mapTrip(row: Record<string, unknown>) {
  return {
    id: row.id,
    originLabel: row.origin_label,
    destinationLabel: row.destination_label,
    originLat: Number(row.origin_lat),
    originLng: Number(row.origin_lng),
    destLat: Number(row.dest_lat),
    destLng: Number(row.dest_lng),
    mode: row.mode,
    logMethod: row.log_method ?? "automatic",
    distanceKm: Number(row.distance_km),
    durationMin: Number(row.duration_min),
    co2eKg: Number(row.co2e_kg),
    polyline: row.polyline,
    legs: row.legs ?? undefined,
    factorGPerKm: Number(row.factor_g_per_km),
    factorSource: row.factor_source,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
  };
}

tripsRouter.get("/", async (req, res, next) => {
  try {
    const id = requireClientId(req, res);
    if (!id) return;
    const { rows } = await pool.query("SELECT * FROM trips WHERE client_id = $1 ORDER BY created_at DESC LIMIT 100", [id]);
    res.json({ trips: rows.map(mapTrip) });
  } catch (err) { next(err); }
});

tripsRouter.post("/", async (req, res, next) => {
  try {
    const id = requireClientId(req, res);
    if (!id) return;
    const parsed = tripBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Trip payload is incomplete or invalid.", details: parsed.error.flatten() });
      return;
    }
    const t = parsed.data;
    const { rows } = await pool.query(
      `INSERT INTO trips (
        client_id, origin_label, destination_label, origin_lat, origin_lng,
        dest_lat, dest_lng, mode, log_method, distance_km, duration_min, co2e_kg,
        polyline, legs, factor_g_per_km, factor_source
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb,$14::jsonb,$15,$16) RETURNING *`,
      [id, t.originLabel, t.destinationLabel, t.originLat, t.originLng, t.destLat, t.destLng, t.mode, t.logMethod, t.distanceKm, t.durationMin, t.co2eKg, JSON.stringify(t.polyline), t.legs ? JSON.stringify(t.legs) : null, t.factorGPerKm, t.factorSource],
    );
    res.status(201).json({ trip: mapTrip(rows[0]) });
  } catch (err) { next(err); }
});

tripsRouter.delete("/", async (req, res, next) => {
  try {
    const id = requireClientId(req, res);
    if (!id) return;
    const result = await pool.query("DELETE FROM trips WHERE client_id = $1", [id]);
    res.json({ deleted: result.rowCount ?? 0 });
  } catch (err) { next(err); }
});

tripsRouter.get("/:id", async (req, res, next) => {
  try {
    const id = requireClientId(req, res);
    if (!id) return;
    const { rows } = await pool.query("SELECT * FROM trips WHERE id = $1 AND client_id = $2", [req.params.id, id]);
    if (!rows[0]) { res.status(404).json({ error: "Trip not found." }); return; }
    res.json({ trip: mapTrip(rows[0]) });
  } catch (err) { next(err); }
});

tripsRouter.delete("/:id", async (req, res, next) => {
  try {
    const id = requireClientId(req, res);
    if (!id) return;
    const result = await pool.query("DELETE FROM trips WHERE id = $1 AND client_id = $2", [req.params.id, id]);
    if (!result.rowCount) { res.status(404).json({ error: "Trip not found." }); return; }
    res.json({ deleted: true });
  } catch (err) { next(err); }
});
