import assert from "node:assert/strict";
import { test } from "node:test";
import { durationMinForMode } from "./geo";
import { kgFromDistance } from "./emissions";
import { roughEstimate } from "./rough";

const TRAIN_FACTOR = {
  mode: "train" as const,
  gPerKm: 35.49,
  source: "DESNZ/DEFRA 2024",
};

test("rough train Portland → Seattle locks distance, duration, CO₂e, polyline", () => {
  const result = roughEstimate("Portland", "Seattle", "train", TRAIN_FACTOR);
  assert.equal(result.origin.label, "Portland, OR");
  assert.equal(result.destination.label, "Seattle, WA");
  assert.equal(result.provider, "haversine");
  assert.equal(result.mode, "train");
  // Great-circle PDX–SEA; 110 km/h + 20 min overhead; 35.49 g/km.
  assert.equal(result.distanceKm, 234.011);
  assert.equal(result.durationMin, 148);
  assert.equal(result.co2eKg, 8.305);
  assert.equal(result.durationMin, durationMinForMode(result.distanceKm, "train"));
  assert.equal(result.co2eKg, kgFromDistance(result.distanceKm, TRAIN_FACTOR.gPerKm));
  assert.ok(result.polyline.length >= 12);
  assert.equal(result.polyline[0][0], result.origin.lat);
  assert.equal(result.polyline[0][1], result.origin.lng);
  const last = result.polyline[result.polyline.length - 1];
  assert.equal(last[0], result.destination.lat);
  assert.equal(last[1], result.destination.lng);
});

test("rough train San Francisco → Sacramento is a shorter corridor than PDX–SEA", () => {
  const result = roughEstimate("San Francisco", "Sacramento", "train", TRAIN_FACTOR);
  assert.ok(result.distanceKm > 100 && result.distanceKm < 160, `got ${result.distanceKm}`);
  assert.equal(result.durationMin, durationMinForMode(result.distanceKm, "train"));
  assert.equal(result.co2eKg, kgFromDistance(result.distanceKm, TRAIN_FACTOR.gPerKm));
  assert.ok(result.polyline.length >= 12);
  assert.ok(result.durationMin < 148);
});

test("rough estimate rejects the same place and a mismatched factor", () => {
  assert.throws(
    () => roughEstimate("Portland", "Portland, OR", "train", TRAIN_FACTOR),
    /different places/,
  );
  assert.throws(
    () =>
      roughEstimate("Portland", "Seattle", "train", {
        mode: "car",
        gPerKm: 164.54,
        source: "nope",
      }),
    /does not match/,
  );
});
