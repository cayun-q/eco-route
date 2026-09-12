import {
  geocodeMock,
  geoJsonLineToPoints,
  type GeoPoint,
  type TravelMode,
} from "@carbonroute/shared";
import { MockRoutingProvider } from "./mock.js";
import type { RoutingProvider, RoutingRequest } from "./types.js";

const ORS_DIRECTIONS = "https://api.openrouteservice.org/v2/directions";
const ORS_GEOCODE = "https://api.openrouteservice.org/geocode/search";

/**
 * OpenRouteService adapter. Car uses the driving-car profile; flights stay
 * great-circle; train has no ORS profile so it falls back to the mock path.
 * Missing ORS_API_KEY or HTTP errors fall back to mock — never hard-fail.
 */
export class OrsRoutingProvider implements RoutingProvider {
  readonly name = "ors";
  private readonly fallback = new MockRoutingProvider();

  constructor(private readonly key = process.env.ORS_API_KEY ?? "") {}

  async estimate(request: RoutingRequest) {
    if (!this.key) {
      return this.withProvider(this.fallback.estimate(request), request.mode);
    }

    try {
      const origin = request.originCoords ?? (await this.geocode(request.origin));
      const dest = request.destCoords ?? (await this.geocode(request.destination));

      if (request.mode !== "car") {
        const mock = await this.fallback.estimate({
          ...request,
          originCoords: origin,
          destCoords: dest,
        });
        return this.withProvider(Promise.resolve(mock), request.mode);
      }

      const response = await fetch(`${ORS_DIRECTIONS}/driving-car/geojson`, {
        method: "POST",
        headers: {
          Authorization: this.key,
          "Content-Type": "application/json",
          Accept: "application/json, application/geo+json",
        },
        body: JSON.stringify({
          coordinates: [
            [origin.lng, origin.lat],
            [dest.lng, dest.lat],
          ],
        }),
      });

      const body = (await response.json().catch(() => null)) as {
        features?: Array<{
          geometry?: { coordinates?: Array<[number, number]> };
          properties?: { summary?: { distance?: number; duration?: number } };
        }>;
      } | null;

      const feature = body?.features?.[0];
      const summary = feature?.properties?.summary;
      if (!response.ok || !feature || summary?.distance == null) {
        return this.fallback.estimate(request);
      }

      const polyline = feature.geometry?.coordinates?.length
        ? geoJsonLineToPoints(feature.geometry.coordinates)
        : (await this.fallback.estimate({ ...request, originCoords: origin, destCoords: dest }))
            .polyline;

      return {
        distanceMiles: Math.round((summary.distance / 1609.344) * 10) / 10,
        durationMinutes: Math.round((summary.duration ?? 0) / 60),
        originCoords: origin,
        destCoords: dest,
        polyline,
        provider: this.name,
        method: "directions" as const,
      };
    } catch {
      return this.fallback.estimate(request);
    }
  }

  private async withProvider(
    estimate: Promise<Awaited<ReturnType<MockRoutingProvider["estimate"]>>>,
    mode: TravelMode,
  ) {
    const mock = await estimate;
    return {
      ...mock,
      provider: this.name,
      method: mode === "plane" ? ("haversine" as const) : mock.method,
    };
  }

  private async geocode(place: string): Promise<GeoPoint> {
    const url = new URL(ORS_GEOCODE);
    url.searchParams.set("api_key", this.key);
    url.searchParams.set("text", place);
    url.searchParams.set("size", "1");
    const response = await fetch(url);
    if (!response.ok) return geocodeMock(place);
    const body = (await response.json()) as {
      features?: Array<{ geometry?: { coordinates?: [number, number] } }>;
    };
    const pair = body.features?.[0]?.geometry?.coordinates;
    if (!pair) return geocodeMock(place);
    return { lng: pair[0], lat: pair[1] };
  }
}
