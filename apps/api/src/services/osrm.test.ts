import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildOsrmUrl, parseOsrmResponse } from "./osrm";

describe("osrm", () => {
  it("builds a driving GeoJSON request", () => {
    const url = buildOsrmUrl([-74.006, 40.7128], [-71.0589, 42.3601], "https://router.project-osrm.org");
    assert.equal(
      url,
      "https://router.project-osrm.org/route/v1/driving/-74.006,40.7128;-71.0589,42.3601?overview=full&geometries=geojson",
    );
  });

  it("reads road coordinates from an OSRM payload", () => {
    const route = parseOsrmResponse({
      code: "Ok",
      routes: [
        {
          distance: 343777,
          duration: 16876,
          geometry: {
            type: "LineString",
            coordinates: [
              [-74.005, 40.712],
              [-73.9, 41.0],
              [-72.5, 41.8],
              [-71.058, 42.359],
            ],
          },
        },
      ],
    });
    assert.equal(route.coordinates.length, 4);
    assert.equal(route.distanceKm, 343.777);
    assert.notDeepEqual(route.coordinates[1], [-73.032, 41.536]);
  });

  it("rejects an empty OSRM payload", () => {
    assert.throws(() => parseOsrmResponse({ code: "Ok", routes: [] }), /no road geometry/);
  });
});
