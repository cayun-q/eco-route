import assert from "node:assert/strict";
import { test } from "node:test";
import { kgFromDistance, lookupGazetteer, mockRoute } from "@carbonroute/shared";
import { routeBetween } from "./services/routing";

test("gazetteer resolves Portland and Seattle", () => {
  const pdx = lookupGazetteer("portland");
  const sea = lookupGazetteer("Seattle, WA");
  assert.ok(pdx && sea);
  assert.ok(pdx.lat > 45 && pdx.lat < 46);
  assert.ok(sea.lat > 47 && sea.lat < 48);
});

test("estimate math stays bound to a table factor", () => {
  const gPerKm = 35.49;
  const distanceKm = 233.412;
  assert.equal(kgFromDistance(distanceKm, gPerKm), 8.284);
});

test("train routeBetween is haversine even when a road API key is set", async () => {
  const prev = process.env.MAPBOX_ACCESS_TOKEN;
  process.env.MAPBOX_ACCESS_TOKEN = "pk.test-not-used-for-train";
  try {
    const origin = lookupGazetteer("Portland")!;
    const destination = lookupGazetteer("Seattle")!;
    const routed = await routeBetween(origin, destination, "train");
    const expected = mockRoute(origin, destination, "train");
    assert.equal(routed.provider, "haversine");
    assert.equal(routed.distanceKm, expected.distanceKm);
    assert.equal(routed.durationMin, expected.durationMin);
    assert.deepEqual(routed.polyline, expected.polyline);
    assert.equal(routed.distanceKm, 234.011);
    assert.equal(routed.durationMin, 148);
    assert.ok(routed.polyline.length >= 12);
  } finally {
    if (prev === undefined) delete process.env.MAPBOX_ACCESS_TOKEN;
    else process.env.MAPBOX_ACCESS_TOKEN = prev;
  }
});
