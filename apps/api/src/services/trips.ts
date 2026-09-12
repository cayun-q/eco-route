import type { CreateTripRequest, Trip, TripSummary } from "@carbonroute/shared";
import { pool, withClient } from "../db/client.js";
import { mapFactor, mapRoute, type FactorRow, type RouteRow } from "../db/mappers.js";
import { estimateEmissions } from "./calculator.js";

interface TripJoinRow extends RouteRow, FactorRow {
  trip_id: string;
  client_id: string;
  user_id: string;
  grams_co2e: string;
  from_distance: string;
  from_duration: string;
  logged_at: Date;
  factor_id: number;
  factor_mode: string;
  factor_subtype: string;
}

const TRIP_SELECT = `
  SELECT
    t.id AS trip_id,
    t.client_id,
    t.user_id,
    t.grams_co2e,
    t.from_distance,
    t.from_duration,
    t.logged_at,
    r.id,
    r.origin,
    r.destination,
    r.origin_lat,
    r.origin_lng,
    r.dest_lat,
    r.dest_lng,
    r.mode,
    r.subtype,
    r.distance_miles,
    r.duration_minutes,
    f.id AS factor_id,
    f.mode AS factor_mode,
    f.subtype AS factor_subtype,
    f.grams_co2e_per_mile,
    f.grams_co2e_per_hour,
    f.source,
    f.year,
    f.is_active
  FROM trips t
  JOIN routes r ON r.id = t.route_id
  JOIN emission_factors f ON f.id = t.emission_factor_id
`;

function mapTrip(row: TripJoinRow): Trip {
  return {
    id: row.trip_id,
    clientId: row.client_id,
    userId: row.user_id,
    gramsCo2e: Number(row.grams_co2e),
    fromDistance: Number(row.from_distance),
    fromDuration: Number(row.from_duration),
    loggedAt: new Date(row.logged_at).toISOString(),
    route: mapRoute(row),
    emissionFactor: mapFactor({
      id: row.factor_id,
      mode: row.factor_mode,
      subtype: row.factor_subtype,
      grams_co2e_per_mile: row.grams_co2e_per_mile,
      grams_co2e_per_hour: row.grams_co2e_per_hour,
      source: row.source,
      year: row.year,
      is_active: row.is_active,
    }),
  };
}

export async function createTrip(
  input: CreateTripRequest,
  userId = "local",
): Promise<Trip> {
  const existing = await pool.query<{ id: string }>(
    "SELECT id FROM trips WHERE client_id = $1",
    [input.clientId],
  );
  if (existing.rows[0]) {
    const trip = await getTrip(existing.rows[0].id);
    if (trip) return trip;
  }

  const estimate = await estimateEmissions(input);

  return withClient(async (client) => {
    await client.query("BEGIN");
    try {
    const route = await client.query<{ id: string }>(
      `
        INSERT INTO routes (
          origin, destination, origin_lat, origin_lng, dest_lat, dest_lng,
          mode, subtype, distance_miles, duration_minutes
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id
      `,
      [
        estimate.route.origin,
        estimate.route.destination,
        estimate.route.originCoords?.lat ?? null,
        estimate.route.originCoords?.lng ?? null,
        estimate.route.destCoords?.lat ?? null,
        estimate.route.destCoords?.lng ?? null,
        estimate.route.mode,
        estimate.route.subtype,
        estimate.route.distanceMiles,
        estimate.route.durationMinutes,
      ],
    );

    const trip = await client.query<{ id: string }>(
      `
        INSERT INTO trips (
          route_id, user_id, emission_factor_id, grams_co2e,
          from_distance, from_duration, client_id, logged_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8::timestamptz, now()))
        ON CONFLICT (client_id) DO UPDATE SET synced_at = now()
        RETURNING id
      `,
      [
        route.rows[0].id,
        userId,
        estimate.emissionFactor.id,
        estimate.emissions.gramsCo2e,
        estimate.emissions.fromDistance,
        estimate.emissions.fromDuration,
        input.clientId,
        input.loggedAt ?? null,
      ],
    );

    const created = await getTrip(trip.rows[0].id, client);
    if (!created) throw new Error("Failed to load created trip");
    await client.query("COMMIT");
    return created;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  });
}

export async function listTrips(limit = 50, userId = "local"): Promise<Trip[]> {
  const { rows } = await pool.query<TripJoinRow>(
    `${TRIP_SELECT} WHERE t.user_id = $1 ORDER BY t.logged_at DESC LIMIT $2`,
    [userId, limit],
  );
  return rows.map(mapTrip);
}

export async function getTrip(
  id: string,
  client: { query: typeof pool.query } = pool,
): Promise<Trip | null> {
  const { rows } = await client.query<TripJoinRow>(
    `${TRIP_SELECT} WHERE t.id = $1`,
    [id],
  );
  return rows[0] ? mapTrip(rows[0]) : null;
}

export async function getSummary(userId = "local"): Promise<TripSummary> {
  const { rows } = await pool.query<{
    mode: TripSummary["byMode"][number]["mode"];
    trip_count: string;
    grams: string;
  }>(
    `
      SELECT r.mode, COUNT(*)::text AS trip_count, COALESCE(SUM(t.grams_co2e), 0)::text AS grams
      FROM trips t
      JOIN routes r ON r.id = t.route_id
      WHERE t.user_id = $1
      GROUP BY r.mode
    `,
    [userId],
  );

  const byMode = rows.map((row) => ({
    mode: row.mode,
    tripCount: Number(row.trip_count),
    gramsCo2e: Number(row.grams),
  }));

  return {
    tripCount: byMode.reduce((sum, row) => sum + row.tripCount, 0),
    totalGramsCo2e: byMode.reduce((sum, row) => sum + row.gramsCo2e, 0),
    byMode,
  };
}
