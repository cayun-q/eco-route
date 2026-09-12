import { Router } from "express";
import { z } from "zod";
import { MODES } from "@carbonroute/shared";
import { geocode, GeocodeError } from "../services/geocode";
import { routeBetween } from "../services/routing";
import { emissionsFor } from "../services/emissions";

export const estimateRouter = Router();

const bodySchema = z.object({
  origin: z.string().trim().min(1).max(200),
  destination: z.string().trim().min(1).max(200),
  mode: z.enum(MODES),
});

estimateRouter.post("/", async (req, res, next) => {
  try {
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "origin, destination, and mode (car|plane|train) are required." });
      return;
    }
    const { origin: originQ, destination: destQ, mode } = parsed.data;
    if (originQ.toLowerCase() === destQ.toLowerCase()) {
      res.status(400).json({ error: "Origin and destination need to be different places." });
      return;
    }

    const [origin, destination] = await Promise.all([geocode(originQ), geocode(destQ)]);
    const routed = await routeBetween(origin, destination, mode);
    const emissions = await emissionsFor(mode, routed.distanceKm);

    res.json({
      origin,
      destination,
      mode,
      distanceKm: routed.distanceKm,
      durationMin: routed.durationMin,
      polyline: routed.polyline,
      co2eKg: emissions.co2eKg,
      factor: emissions.factor,
      drivingCo2eKg: emissions.drivingCo2eKg,
      vsDrivingKg: emissions.vsDrivingKg,
      provider: routed.provider,
    });
  } catch (err) {
    if (err instanceof GeocodeError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    next(err);
  }
});
