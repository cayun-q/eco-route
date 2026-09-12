import { kgFromDistance, type TransportMode } from "@carbonroute/shared";
import { loadFactor, type FactorRow } from "../db";

export function factorToDto(row: FactorRow) {
  return {
    mode: row.mode,
    gPerKm: Number(row.g_per_km),
    source: row.source,
    notes: row.notes,
    updatedAt: row.updated_at.toISOString(),
  };
}

export async function emissionsFor(
  mode: TransportMode,
  distanceKm: number,
): Promise<{
  co2eKg: number;
  factor: ReturnType<typeof factorToDto>;
  drivingCo2eKg: number | null;
  vsDrivingKg: number | null;
}> {
  const row = await loadFactor(mode);
  if (!row) {
    throw Object.assign(new Error(`No factor row for mode "${mode}"`), { status: 500 });
  }
  const factor = factorToDto(row);
  const co2eKg = kgFromDistance(distanceKm, factor.gPerKm);

  let drivingCo2eKg: number | null = null;
  let vsDrivingKg: number | null = null;
  if (mode !== "car") {
    const car = await loadFactor("car");
    if (car) {
      drivingCo2eKg = kgFromDistance(distanceKm, Number(car.g_per_km));
      vsDrivingKg = Math.round((co2eKg - drivingCo2eKg) * 1000) / 1000;
    }
  }

  return { co2eKg, factor, drivingCo2eKg, vsDrivingKg };
}
