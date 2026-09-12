import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { OrsRoutingProvider } from "./ors.js";

describe("OrsRoutingProvider", () => {
  it("falls back to mock geometry when ORS_API_KEY is missing", async () => {
    const route = await new OrsRoutingProvider("").estimate({
      origin: "London",
      destination: "Paris",
      mode: "car",
    });
    assert.equal(route.provider, "ors");
    assert.equal(route.method, "mock");
    assert.ok(route.polyline.length >= 2);
    assert.ok(route.distanceMiles > 200);
  });

  it("keeps flights on a great-circle even when a key is present", async () => {
    const route = await new OrsRoutingProvider("test-key").estimate({
      origin: "London",
      destination: "Paris",
      mode: "plane",
      originCoords: { lat: 51.5074, lng: -0.1278 },
      destCoords: { lat: 48.8566, lng: 2.3522 },
    });
    assert.equal(route.method, "haversine");
    assert.ok(route.polyline.length >= 2);
  });
});
