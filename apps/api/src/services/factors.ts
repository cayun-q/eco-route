import { pickFactor, type EmissionFactor, type FactorSubtype, type TravelMode } from "@carbonroute/shared";
import { pool } from "../db/client.js";
import { mapFactor, type FactorRow } from "../db/mappers.js";

export async function listActiveFactors(): Promise<EmissionFactor[]> {
  const { rows } = await pool.query<FactorRow>(
    `
      SELECT id, mode, subtype, grams_co2e_per_mile, grams_co2e_per_hour,
             source, year, is_active
      FROM emission_factors
      WHERE is_active = true
      ORDER BY mode, subtype
    `,
  );
  return rows.map(mapFactor);
}

export async function getFactor(
  mode: TravelMode,
  subtype: FactorSubtype,
): Promise<EmissionFactor> {
  const factors = await listActiveFactors();
  return pickFactor(factors, mode, subtype);
}
