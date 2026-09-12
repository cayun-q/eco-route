import type { EstimatedLeg, Place, TravelMode, Trip } from "@carbonroute/shared";
import { query } from "./db.js";
import { estimateItinerary, tripTitle } from "./estimate.js";
import type { EstimateRequest } from "@carbonroute/shared";

type TripRow = {
  id: string;
  title: string;
  distance_km: string;
  duration_min: string;
  co2e_kg: string;
  created_at: Date;
};

type LegRow = {
  seq: number;
  mode: TravelMode;
  origin_label: string;
  origin_lat: number;
  origin_lng: number;
  origin_kind: Place["kind"];
  origin_place_id: string | null;
  origin_iata: string | null;
  destination_label: string;
  destination_lat: number;
  destination_lng: number;
  destination_kind: Place["kind"];
  destination_place_id: string | null;
  destination_iata: string | null;
  distance_km: string;
  duration_min: string;
  co2e_kg: string;
  factor_id: number | null;
  kg_co2e_per_km: string;
  polyline: EstimatedLeg["polyline"];
  activity: string | null;
  band: string | null;
  source: string | null;
  year: number | null;
};

function placeFrom(
  id: string | null,
  label: string,
  kind: Place["kind"],
  lat: number,
  lng: number,
  iata?: string | null,
): Place {
  return { id: id ?? `custom:${label}`, label, kind, lat, lng, iata: iata ?? undefined };
}

function mapLeg(row: LegRow): EstimatedLeg {
  return {
    seq: row.seq,
    mode: row.mode,
    origin: placeFrom(row.origin_place_id, row.origin_label, row.origin_kind, row.origin_lat, row.origin_lng, row.origin_iata),
    destination: placeFrom(
      row.destination_place_id,
      row.destination_label,
      row.destination_kind,
      row.destination_lat,
      row.destination_lng,
      row.destination_iata,
    ),
    distanceKm: Number(row.distance_km),
    durationMin: Number(row.duration_min),
    co2eKg: Number(row.co2e_kg),
    kgCo2ePerKm: Number(row.kg_co2e_per_km),
    factor: {
      id: row.factor_id ?? 0,
      activity: row.activity ?? "unknown",
      band: row.band,
      source: row.source ?? "DESNZ/DEFRA",
      year: row.year ?? 2024,
    },
    polyline: row.polyline,
  };
}

async function loadLegs(tripId: string): Promise<EstimatedLeg[]> {
  const { rows } = await query<LegRow>(
    `SELECT l.seq, l.mode, l.origin_label, l.origin_lat, l.origin_lng, l.origin_kind, l.origin_place_id, l.origin_iata,
            l.destination_label, l.destination_lat, l.destination_lng, l.destination_kind, l.destination_place_id, l.destination_iata,
            l.distance_km::text, l.duration_min::text, l.co2e_kg::text, l.factor_id, l.kg_co2e_per_km::text, l.polyline,
            f.activity, f.band, f.source, f.year
     FROM trip_legs l
     LEFT JOIN emission_factors f ON f.id = l.factor_id
     WHERE l.trip_id = $1
     ORDER BY l.seq ASC`,
    [tripId],
  );
  return rows.map(mapLeg);
}

export async function listTrips(): Promise<Trip[]> {
  const { rows } = await query<TripRow>(
    `SELECT id, title, distance_km::text, duration_min::text, co2e_kg::text, created_at
     FROM trips ORDER BY created_at DESC LIMIT 50`,
  );
  const trips: Trip[] = [];
  for (const row of rows) {
    const legs = await loadLegs(row.id);
    trips.push({
      id: row.id,
      title: row.title,
      createdAt: row.created_at.toISOString(),
      legs,
      totals: {
        distanceKm: Number(row.distance_km),
        durationMin: Number(row.duration_min),
        co2eKg: Number(row.co2e_kg),
      },
    });
  }
  return trips;
}

export async function getTrip(id: string): Promise<Trip | null> {
  const { rows } = await query<TripRow>(
    `SELECT id, title, distance_km::text, duration_min::text, co2e_kg::text, created_at
     FROM trips WHERE id = $1`,
    [id],
  );
  const row = rows[0];
  if (!row) return null;
  const legs = await loadLegs(row.id);
  return {
    id: row.id,
    title: row.title,
    createdAt: row.created_at.toISOString(),
    legs,
    totals: {
      distanceKm: Number(row.distance_km),
      durationMin: Number(row.duration_min),
      co2eKg: Number(row.co2e_kg),
    },
  };
}

export async function createTrip(body: EstimateRequest & { title?: string }): Promise<Trip> {
  const estimate = await estimateItinerary(body);
  const title = body.title?.trim() || tripTitle(estimate.legs);
  const client = await (await import("./db.js")).pool.connect();
  try {
    await client.query("BEGIN");
    const inserted = await client.query<TripRow>(
      `INSERT INTO trips (title, distance_km, duration_min, co2e_kg)
       VALUES ($1, $2, $3, $4)
       RETURNING id, title, distance_km::text, duration_min::text, co2e_kg::text, created_at`,
      [title, estimate.totals.distanceKm, estimate.totals.durationMin, estimate.totals.co2eKg],
    );
    const trip = inserted.rows[0];
    for (const leg of estimate.legs) {
      await client.query(
        `INSERT INTO trip_legs (
           trip_id, seq, mode,
           origin_label, origin_lat, origin_lng, origin_kind, origin_place_id, origin_iata,
           destination_label, destination_lat, destination_lng, destination_kind, destination_place_id, destination_iata,
           distance_km, duration_min, co2e_kg, factor_id, kg_co2e_per_km, polyline
         ) VALUES (
           $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21::jsonb
         )`,
        [
          trip.id,
          leg.seq,
          leg.mode,
          leg.origin.label,
          leg.origin.lat,
          leg.origin.lng,
          leg.origin.kind,
          leg.origin.id,
          leg.origin.iata ?? null,
          leg.destination.label,
          leg.destination.lat,
          leg.destination.lng,
          leg.destination.kind,
          leg.destination.id,
          leg.destination.iata ?? null,
          leg.distanceKm,
          leg.durationMin,
          leg.co2eKg,
          leg.factor.id,
          leg.kgCo2ePerKm,
          JSON.stringify(leg.polyline),
        ],
      );
    }
    await client.query("COMMIT");
    return {
      id: trip.id,
      title: trip.title,
      createdAt: trip.created_at.toISOString(),
      legs: estimate.legs,
      totals: estimate.totals,
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
