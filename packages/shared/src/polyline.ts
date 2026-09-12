import type { GeoPoint } from "./types";
import { simplifyPolyline } from "./geo";

/** Convert a GeoJSON LineString ([lng, lat][]) into app coordinates. */
export function geoJsonLineToPoints(coordinates: Array<[number, number] | number[]>): GeoPoint[] {
  const points = coordinates
    .filter((pair) => pair.length >= 2 && Number.isFinite(pair[0]) && Number.isFinite(pair[1]))
    .map((pair) => ({ lng: pair[0], lat: pair[1] }));
  return simplifyPolyline(points);
}

/**
 * Decode a Google / Mapbox encoded polyline into WGS84 points.
 * @see https://developers.google.com/maps/documentation/utilities/polylinealgorithm
 */
export function decodeGooglePolyline(encoded: string): GeoPoint[] {
  const points: GeoPoint[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    lat += decodeChunk();
    lng += decodeChunk();
    points.push({
      lat: lat / 1e5,
      lng: lng / 1e5,
    });
  }

  return simplifyPolyline(points);

  function decodeChunk(): number {
    let result = 0;
    let shift = 0;
    let byte: number;
    do {
      byte = encoded.charCodeAt(index) - 63;
      index += 1;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    return result & 1 ? ~(result >> 1) : result >> 1;
  }
}
