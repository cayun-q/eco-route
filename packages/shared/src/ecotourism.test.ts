import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CAR_PRESETS,
  MILES_TO_KM,
  PLANE_DISTANCE_UPLIFT,
  classifyFlight,
  compareTrip,
  distanceBetweenCities,
  planeCo2LbPerPassenger,
  planeTripEmissions,
} from "./ecotourism";

test("NY→LA fly ~2446 mi, drive ~3057 mi", () => {
  const fly = distanceBetweenCities("new_york", "los_angeles", "fly");
  const drive = distanceBetweenCities("new_york", "los_angeles", "drive");
  assert.equal(Math.round(fly), 2446);
  assert.equal(Math.round(drive), 3057);
});

test("Pittsburgh→NYC compare_trip lb/person (2 pax) matches Python goldens", () => {
  const results = compareTrip("pittsburgh", "new_york", 2);
  const byLabel = Object.fromEntries(
    results.map((r) => [r.vehicle, Math.round(r.co2_per_passenger_lb * 10) / 10]),
  );

  assert.equal(byLabel["Battery EV"], 58.9);
  assert.equal(byLabel["Hybrid"], 77.1);
  assert.equal(byLabel["Gasoline — efficient car"], 110.2);
  assert.equal(byLabel["Gasoline — average car"], 128.5);
  assert.equal(byLabel["Diesel car"], 147.2);
  assert.equal(byLabel["Plane — Domestic — Economy"], 149.6);
  assert.equal(byLabel["Gasoline — SUV"], 192.8);
});

test("classifyFlight thresholds: km<1000 domestic, km<3700 short_haul, else long_haul", () => {
  const milesAt999km = 999 / MILES_TO_KM;
  const milesAt1000km = 1000 / MILES_TO_KM;
  const milesAt3699km = 3699 / MILES_TO_KM;
  const milesAt3700km = 3700 / MILES_TO_KM;

  assert.equal(classifyFlight(milesAt999km), "domestic");
  assert.equal(classifyFlight(milesAt1000km), "short_haul");
  assert.equal(classifyFlight(milesAt3699km), "short_haul");
  assert.equal(classifyFlight(milesAt3700km), "long_haul");
});

test("plane applies 1.08 distance uplift by default", () => {
  const miles = 300;
  const withUplift = planeCo2LbPerPassenger(miles, null, "economy", true);
  const without = planeCo2LbPerPassenger(miles, null, "economy", false);
  assert.ok(Math.abs(withUplift / without - PLANE_DISTANCE_UPLIFT) < 1e-12);
  // Default argument is uplift on
  const defaulted = planeCo2LbPerPassenger(miles);
  assert.equal(defaulted, withUplift);
});

test("CAR_PRESETS match Python MVP values", () => {
  assert.equal((CAR_PRESETS.gas_economy as { mpg: number }).mpg, 35);
  assert.equal((CAR_PRESETS.gas_average as { mpg: number }).mpg, 30);
  assert.equal((CAR_PRESETS.gas_suv as { mpg: number }).mpg, 20);
  assert.equal((CAR_PRESETS.diesel as { mpg: number }).mpg, 30);
  assert.equal((CAR_PRESETS.hybrid as { mpg: number }).mpg, 50);
  assert.equal(
    (CAR_PRESETS.ev as { kwh_per_100_miles: number }).kwh_per_100_miles,
    39,
  );
});

test("planeTripEmissions uses classifyFlight when type omitted", () => {
  const pittNyc = distanceBetweenCities("pittsburgh", "new_york", "fly");
  const trip = planeTripEmissions(pittNyc, 1);
  assert.match(trip.vehicle, /Domestic/);
  assert.equal(Math.round(trip.co2_per_passenger_lb * 10) / 10, 149.6);
});
