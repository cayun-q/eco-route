import assert from "node:assert/strict";
import { test } from "node:test";
import { factorForMode, kgFromDistance } from "./emissions";
import { decodePolyline, haversineKm, mockRoute } from "./geo";
import type { EmissionFactor } from "./types";

test("kgFromDistance uses the supplied factor, not a hardcoded g/km", () => {
  assert.equal(kgFromDistance(100, 164.54), 16.454);
  assert.equal(kgFromDistance(233.4, 35.49), 8.283);
  assert.equal(kgFromDistance(0, 245.87), 0);
});

test("kgFromDistance rejects invented or invalid factors", () => {
  assert.throws(() => kgFromDistance(10, Number.NaN));
  assert.throws(() => kgFromDistance(-1, 100));
});

test("factorForMode reads the table row", () => {
  const table: EmissionFactor[] = [
    { mode: "train", gPerKm: 35.49, source: "DEFRA 2024" },
    { mode: "car", gPerKm: 164.54, source: "DEFRA 2024" },
  ];
  assert.equal(factorForMode(table, "train").gPerKm, 35.49);
  assert.throws(() => factorForMode(table, "plane"));
});

test("haversine Portland to Seattle is ~233 km", () => {
  const km = haversineKm(
    { lat: 45.5152, lng: -122.6784 },
    { lat: 47.6062, lng: -122.3321 },
  );
  assert.ok(km > 220 && km < 250, `got ${km}`);
});

test("mockRoute returns a polyline with both endpoints", () => {
  const route = mockRoute(
    { lat: 45.5152, lng: -122.6784 },
    { lat: 47.6062, lng: -122.3321 },
    "train",
  );
  assert.ok(route.polyline.length >= 12);
  assert.equal(route.polyline[0][0], 45.5152);
  assert.ok(route.durationMin > 0);
});

test("decodePolyline reads a short Google polyline", () => {
  // ~ (38.5, -120.2) to (40.7, -120.95)
  const pts = decodePolyline("_p~iF~ps|U_ulLnnqC");
  assert.ok(pts.length >= 2);
  assert.ok(Math.abs(pts[0][0] - 38.5) < 0.01);
});
