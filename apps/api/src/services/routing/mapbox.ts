import type { GeoPoint } from "@carbonroute/shared";
import { geocodeMock } from "./cities.js";
import { MockRoutingProvider } from "./mock.js";
import type { RoutingProvider, RoutingRequest } from "./types.js";

/**
 * Mapbox Directions + Geocoding. When MAPBOX_ACCESS_TOKEN is unset the
 * mock provider is used so local/dev never hard-fails.
 *
 * Plug in a token via env — no other code changes required.
 */
export class MapboxRoutingProvider implements RoutingProvider {
  readonly name = "mapbox";
  private readonly fallback = new MockRoutingProvider();

  constructor(private readonly token = process.env.MAPBOX_ACCESS_TOKEN ?? "") {}

  async estimate(request: RoutingRequest) {
    if (!this.token) {
      return this.fallback.estimate(request);
    }

    try {
      const origin = request.originCoords ?? (await this.geocode(request.origin));
      const dest = request.destCoords ?? (await this.geocode(request.destination));

      if (request.mode === "plane") {
        const mock = await this.fallback.estimate({
          ...request,
          originCoords: origin,
          destCoords: dest,
        });
        return { ...mock, provider: this.name, method: "haversine" as const };
      }

      const profile = "driving";
      const url = new URL(
        `https://api.mapbox.com/directions/v5/mapbox/${profile}/${origin.lng},${origin.lat};${dest.lng},${dest.lat}`,
      );
      url.searchParams.set("access_token", this.token);
      url.searchParams.set("overview", "false");

      const response = await fetch(url);
      if (!response.ok) {
        return this.fallback.estimate(request);
      }
      const body = (await response.json()) as {
        routes?: Array<{ distance: number; duration: number }>;
      };
      const route = body.routes?.[0];
      if (!route) {
        return this.fallback.estimate(request);
      }

      return {
        distanceMiles: Math.round((route.distance / 1609.344) * 10) / 10,
        durationMinutes: Math.round(route.duration / 60),
        originCoords: origin,
        destCoords: dest,
        provider: this.name,
        method: "directions" as const,
      };
    } catch {
      return this.fallback.estimate(request);
    }
  }

  private async geocode(place: string): Promise<GeoPoint> {
    const url = new URL(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(place)}.json`,
    );
    url.searchParams.set("access_token", this.token);
    url.searchParams.set("limit", "1");
    const response = await fetch(url);
    if (!response.ok) return geocodeMock(place);
    const body = (await response.json()) as {
      features?: Array<{ center: [number, number] }>;
    };
    const center = body.features?.[0]?.center;
    if (!center) return geocodeMock(place);
    return { lng: center[0], lat: center[1] };
  }
}
