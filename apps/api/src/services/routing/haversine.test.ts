import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MockRoutingProvider } from "./mock.js";

describe("MockRoutingProvider", () => {
  it("uses haversine for flights between known cities", async () => {
    const route = await new MockRoutingProvider().estimate({
      origin: "London",
      destination: "Paris",
      mode: "plane",
    });
    assert.equal(route.method, "haversine");
    assert.ok(route.distanceMiles > 200 && route.distanceMiles < 230);
    assert.ok(route.durationMinutes > 45);
  });

  it("inflates road distance vs great-circle", async () => {
    const provider = new MockRoutingProvider();
    const flight = await provider.estimate({
      origin: "London",
      destination: "Manchester",
      mode: "plane",
    });
    const car = await provider.estimate({
      origin: "London",
      destination: "Manchester",
      mode: "car",
    });
    assert.ok(car.distanceMiles > flight.distanceMiles);
  });
});
