import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { sumTotals } from "@carbonroute/shared";
import { pool } from "../src/db.js";
import { estimateItinerary, normalizeLegs } from "../src/estimate.js";
import { migrate } from "../src/migrate.js";
import { flightBand } from "../src/routing.js";
import { createTrip } from "../src/trips.js";

before(async () => {
  await migrate();
});

after(async () => {
  await pool.end();
});

test("normalizeLegs accepts a single-leg payload", () => {
  const legs = normalizeLegs({
    mode: "train",
    origin: { placeId: "stpancras" },
    destination: { placeId: "gdn" },
  });
  assert.equal(legs.length, 1);
  assert.equal(legs[0].mode, "train");
});

test("normalizeLegs accepts multi-leg payloads", () => {
  const legs = normalizeLegs({
    legs: [
      { mode: "car", origin: { placeId: "sf" }, destination: { placeId: "sfo" } },
      { mode: "plane", origin: { placeId: "sfo" }, destination: { placeId: "jfk" } },
    ],
  });
  assert.equal(legs.length, 2);
});

test("sumTotals adds distance, duration, and CO2 from every leg", () => {
  const totals = sumTotals([
    { distanceKm: 20.1, durationMin: 25, co2eKg: 3.312 },
    { distanceKm: 4150.4, durationMin: 370, co2eKg: 772.082 },
    { distanceKm: 18.7, durationMin: 22, co2eKg: 3.081 },
  ]);
  assert.equal(totals.distanceKm, 4189.2);
  assert.equal(totals.durationMin, 417);
  assert.equal(totals.co2eKg, 778.475);
});

test("car → plane → car totals equal the sum of per-leg CO2 from DB factors", async () => {
  const estimate = await estimateItinerary({
    legs: [
      { mode: "car", origin: { placeId: "sf" }, destination: { placeId: "sfo" } },
      { mode: "plane", origin: { placeId: "sfo" }, destination: { placeId: "jfk" } },
      { mode: "car", origin: { placeId: "jfk" }, destination: { placeId: "brooklyn" } },
    ],
  });

  assert.equal(estimate.legs.length, 3);
  assert.deepEqual(
    estimate.legs.map((l) => l.mode),
    ["car", "plane", "car"],
  );

  const summedCo2 = estimate.legs.reduce((sum, leg) => sum + leg.co2eKg, 0);
  assert.ok(Math.abs(estimate.totals.co2eKg - summedCo2) < 0.002);
  assert.ok(
    Math.abs(estimate.totals.distanceKm - estimate.legs.reduce((s, l) => s + l.distanceKm, 0)) < 0.02,
  );

  const { rows } = await pool.query<{ kg_co2e_per_km: string }>(
    `SELECT kg_co2e_per_km::text FROM emission_factors WHERE mode = $1 AND band = $2`,
    ["car", "average"],
  );
  const carFactor = Number(rows[0].kg_co2e_per_km);
  assert.ok(carFactor > 0);
  assert.equal(estimate.legs[0].kgCo2ePerKm, carFactor);
  assert.ok(Math.abs(estimate.legs[0].co2eKg - estimate.legs[0].distanceKm * carFactor) < 0.02);

  const plane = estimate.legs[1];
  assert.equal(plane.factor.band, flightBand(plane.distanceKm) === "domestic" ? "domestic" : plane.factor.band);
  assert.equal(estimate.legs[1].origin.iata, "SFO");
  assert.equal(estimate.legs[1].destination.iata, "JFK");
  assert.ok(plane.factor.source.includes("DESNZ/DEFRA"));
  assert.ok(plane.co2eKg > estimate.legs[0].co2eKg);
  assert.ok(plane.polyline.length > 4);
  assert.ok(estimate.legs.every((leg) => leg.polyline.length > 2));
});

test("estimate accepts Nominatim-style label+lat/lng places", async () => {
  const estimate = await estimateItinerary({
    legs: [
      {
        mode: "car",
        origin: { label: "1 Market St, San Francisco", lat: 37.7936, lng: -122.394 },
        destination: { label: "SFO Terminal", lat: 37.6213, lng: -122.379 },
      },
    ],
  });
  assert.equal(estimate.legs.length, 1);
  assert.equal(estimate.legs[0].origin.label, "1 Market St, San Francisco");
  assert.equal(estimate.totals.co2eKg, estimate.legs[0].co2eKg);
});

test("single-mode estimate still works and uses the factor table", async () => {
  const estimate = await estimateItinerary({
    mode: "train",
    origin: { placeId: "stpancras" },
    destination: { placeId: "gdn" },
  });
  assert.equal(estimate.legs.length, 1);
  assert.equal(estimate.legs[0].mode, "train");
  assert.equal(estimate.totals.co2eKg, estimate.legs[0].co2eKg);
  assert.equal(estimate.legs[0].factor.activity, "National rail");
  const { rows } = await pool.query<{ kg_co2e_per_km: string }>(
    `SELECT kg_co2e_per_km::text FROM emission_factors WHERE mode = 'train' AND band = 'national_rail'`,
  );
  assert.equal(estimate.legs[0].kgCo2ePerKm, Number(rows[0].kg_co2e_per_km));
});

test("persisted trip stores every leg and summed totals", async () => {
  const trip = await createTrip({
    title: "Drive–fly–drive test",
    legs: [
      { mode: "car", origin: { placeId: "sf" }, destination: { placeId: "sfo" } },
      { mode: "plane", origin: { placeId: "sfo" }, destination: { placeId: "jfk" } },
      { mode: "car", origin: { placeId: "jfk" }, destination: { placeId: "brooklyn" } },
    ],
  });
  assert.equal(trip.legs.length, 3);
  const { rows } = await pool.query<{ n: string; co2: string }>(
    `SELECT COUNT(*)::text AS n, SUM(co2e_kg)::text AS co2 FROM trip_legs WHERE trip_id = $1`,
    [trip.id],
  );
  assert.equal(Number(rows[0].n), 3);
  assert.ok(Math.abs(Number(rows[0].co2) - trip.totals.co2eKg) < 0.02);
});
