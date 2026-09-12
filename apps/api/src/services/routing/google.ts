import { decodeGooglePolyline, geocodeMock, type GeoPoint } from "@carbonroute/shared";
import { MockRoutingProvider } from "./mock.js";
import type { RoutingProvider, RoutingRequest } from "./types.js";

/**
 * Google Directions adapter. When GOOGLE_MAPS_API_KEY is unset, falls back
 * to the mock provider. Flights always use haversine (great-circle).
 */
export class GoogleRoutingProvider implements RoutingProvider {
  readonly name = "google";
  private readonly fallback = new MockRoutingProvider();

  constructor(private readonly key = process.env.GOOGLE_MAPS_API_KEY ?? "") {}

  async estimate(request: RoutingRequest) {
    if (!this.key) {
      return this.fallback.estimate(request);
    }

    try {
      if (request.mode === "plane") {
        const mock = await this.fallback.estimate(request);
        return { ...mock, provider: this.name, method: "haversine" as const };
      }

      const url = new URL("https://maps.googleapis.com/maps/api/directions/json");
      url.searchParams.set("origin", formatPlace(request.origin, request.originCoords));
      url.searchParams.set(
        "destination",
        formatPlace(request.destination, request.destCoords),
      );
      url.searchParams.set("mode", request.mode === "train" ? "transit" : "driving");
      url.searchParams.set("key", this.key);

      const response = await fetch(url);
      if (!response.ok) {
        return this.fallback.estimate(request);
      }
      const body = (await response.json()) as {
        status: string;
        routes?: Array<{
          overview_polyline?: { points?: string };
          legs: Array<{
            distance: { value: number };
            duration: { value: number };
            start_location: { lat: number; lng: number };
            end_location: { lat: number; lng: number };
          }>;
        }>;
      };
      const route = body.routes?.[0];
      const leg = route?.legs?.[0];
      if (body.status !== "OK" || !leg) {
        return this.fallback.estimate(request);
      }

      const originCoords = {
        lat: leg.start_location.lat,
        lng: leg.start_location.lng,
      };
      const destCoords = { lat: leg.end_location.lat, lng: leg.end_location.lng };
      const fallback = await this.fallback.estimate({
        ...request,
        originCoords,
        destCoords,
      });
      const decoded = route.overview_polyline?.points
        ? decodeGooglePolyline(route.overview_polyline.points)
        : [];

      return {
        distanceMiles: Math.round((leg.distance.value / 1609.344) * 10) / 10,
        durationMinutes: Math.round(leg.duration.value / 60),
        originCoords,
        destCoords,
        polyline: decoded.length >= 2 ? decoded : fallback.polyline,
        provider: this.name,
        method: "directions" as const,
      };
    } catch {
      return this.fallback.estimate(request);
    }
  }
}

function formatPlace(name: string, coords?: GeoPoint | null): string {
  if (coords) return `${coords.lat},${coords.lng}`;
  return name || `${geocodeMock(name).lat},${geocodeMock(name).lng}`;
}
