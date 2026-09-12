import { Router } from "express";
import { MODES, type TransportMode } from "@carbonroute/shared";
import { pool } from "../db";

export const statsRouter = Router();

statsRouter.get("/", async (_req, res, next) => {
  try {
    const { rows } = await pool.query<{
      mode: TransportMode;
      count: string;
      co2e: string;
    }>(
      "SELECT mode, COUNT(*)::text AS count, COALESCE(SUM(co2e_kg), 0)::text AS co2e FROM trips WHERE mode IN ('car', 'plane') GROUP BY mode",
    );
    const byMode = Object.fromEntries(
      MODES.map((mode) => [mode, { count: 0, co2eKg: 0 }]),
    ) as Record<TransportMode, { count: number; co2eKg: number }>;
    let tripCount = 0;
    let totalCo2eKg = 0;
    for (const row of rows) {
      const count = Number(row.count);
      const co2eKg = Number(row.co2e);
      byMode[row.mode] = { count, co2eKg };
      tripCount += count;
      totalCo2eKg += co2eKg;
    }
    res.json({
      tripCount,
      totalCo2eKg: Math.round(totalCo2eKg * 1000) / 1000,
      byMode,
    });
  } catch (err) {
    next(err);
  }
});
