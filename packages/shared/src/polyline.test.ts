import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { decodeGooglePolyline, geoJsonLineToPoints } from "./polyline";

describe("decodeGooglePolyline", () => {
  it("decodes the documented Google sample", () => {
    const points = decodeGooglePolyline("_p~iF~ps|U_ulLnnqC_mqNvxq`@");
    assert.equal(points.length, 3);
    assert.ok(Math.abs(points[0].lat - 38.5) < 0.001);
    assert.ok(Math.abs(points[0].lng - -120.2) < 0.001);
    assert.ok(Math.abs(points[2].lat - 43.252) < 0.001);
    assert.ok(Math.abs(points[2].lng - -126.453) < 0.001);
  });
});

describe("geoJsonLineToPoints", () => {
  it("swaps [lng, lat] pairs into GeoPoints", () => {
    const points = geoJsonLineToPoints([
      [-0.1278, 51.5074],
      [2.3522, 48.8566],
    ]);
    assert.deepEqual(points[0], { lng: -0.1278, lat: 51.5074 });
    assert.deepEqual(points[1], { lng: 2.3522, lat: 48.8566 });
  });
});
