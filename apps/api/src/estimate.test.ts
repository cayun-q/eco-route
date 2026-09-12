import assert from "node:assert/strict";
import { test } from "node:test";
import { lookupGazetteer } from "@carbonroute/shared";
import { kgFromDistance } from "@carbonroute/shared";

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
