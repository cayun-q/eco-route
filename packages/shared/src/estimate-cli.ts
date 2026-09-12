import { MODES, type TransportMode } from "./types";
import { roughEstimate } from "./rough";

/**
 * Local demo factor matching apps/api/db/seed.sql (DESNZ/DEFRA 2024).
 * The API never uses this — it reads `emission_factors` from Postgres.
 */
const SEED_G_PER_KM: Record<TransportMode, number> = {
  car: 164.54,
  plane: 245.87,
  train: 35.49,
};

function usage(): never {
  console.error("Usage: npm run estimate -- <origin> <destination> [mode]");
  console.error('Example: npm run estimate -- "Portland, OR" "Seattle, WA" train');
  process.exit(1);
}

const originQ = process.argv[2];
const destQ = process.argv[3];
const modeArg = (process.argv[4] ?? "train").toLowerCase();

if (!originQ || !destQ) usage();
if (!MODES.includes(modeArg as TransportMode)) {
  console.error(`mode must be one of: ${MODES.join(", ")}`);
  usage();
}

const mode = modeArg as TransportMode;
const gPerKm = Number(process.env.G_PER_KM ?? SEED_G_PER_KM[mode]);

try {
  const result = roughEstimate(originQ, destQ, mode, {
    mode,
    gPerKm,
    source: "DESNZ/DEFRA 2024 (CLI default; API uses emission_factors)",
  });
  console.log(`${result.origin.label} → ${result.destination.label} (${mode})`);
  console.log(`  distance: ${result.distanceKm} km`);
  console.log(`  duration: ${result.durationMin} min`);
  console.log(`  CO₂e:     ${result.co2eKg} kg  (${gPerKm} g/km)`);
  console.log(`  provider: ${result.provider}`);
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}
