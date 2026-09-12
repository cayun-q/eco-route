import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hasBothEnds, localRouteGeometry } from "./previewGeometry";

describe("hasBothEnds", () => {
  it("is true only when origin and destination are non-empty", () => {
    assert.equal(hasBothEnds("London", "Paris"), true);
    assert.equal(hasBothEnds("London", "  "), false);
    assert.equal(hasBothEnds("", "Paris"), false);
  });
});

describe("localRouteGeometry", () => {
  it("geocodes known cities and returns a polyline", () => {
    const geometry = localRouteGeometry("London", "Paris");
    assert.ok(geometry.origin.lat > 51);
    assert.ok(geometry.destination.lat > 48);
    assert.ok(geometry.polyline.length >= 2);
  });
});
