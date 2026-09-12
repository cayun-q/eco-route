import type { GeoPoint } from "@carbonroute/shared";

export interface LocationFix {
  coords: GeoPoint;
  label: string;
}

export async function getOriginFromGps(): Promise<LocationFix> {
  const Location = await import("expo-location");
  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission.status !== "granted") {
    throw new Error("Location permission was denied");
  }
  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
  const coords = {
    lat: position.coords.latitude,
    lng: position.coords.longitude,
  };
  try {
    const places = await Location.reverseGeocodeAsync({
      latitude: coords.lat,
      longitude: coords.lng,
    });
    const place = places[0];
    const label = [place?.city, place?.region, place?.isoCountryCode]
      .filter(Boolean)
      .join(", ");
    return { coords, label: label || `${coords.lat.toFixed(3)}, ${coords.lng.toFixed(3)}` };
  } catch {
    return { coords, label: `${coords.lat.toFixed(3)}, ${coords.lng.toFixed(3)}` };
  }
}
