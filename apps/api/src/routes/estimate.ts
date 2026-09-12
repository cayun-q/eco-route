import { Router } from "express";
import { z } from "zod";
import { CAR_PRESETS, MODES } from "@carbonroute/shared";
import { geocode, GeocodeError } from "../services/geocode";
import { routeBetween, RoutingError } from "../services/routing";
import { emissionsFor } from "../services/emissions";

export const estimateRouter = Router();

const carPresetKeys = Object.keys(CAR_PRESETS) as [string, ...string[]];

const bodySchema = z.object({
  origin: z.string().trim().min(1).max(200),
  destination: z.string().trim().min(1).max(200),
  mode: z.enum(MODES),
  passengers: z.number().int().min(1).optional(),
  vehicle: z
    .enum(carPresetKeys as [keyof typeof CAR_PRESETS, ...Array<keyof typeof CAR_PRESETS>])
    .optional(),
  cabinClass: z.enum(["economy", "premium_economy", "business", "first"]).optional(),
});

estimateRouter.post("/", async (req, res, next) => {
  try {
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error:
          "origin, destination, and mode (car|plane|train) are required. Optional: passengers, vehicle, cabinClass.",
      });
      return;
    }
    const {
      origin: originQ,
      destination: destQ,
      mode,
      passengers,
      vehicle,
      cabinClass,
    } = parsed.data;
    if (originQ.toLowerCase() === destQ.toLowerCase()) {
      res.status(400).json({ error: "Origin and destination need to be different places." });
      return;
    }

    const [origin, destination] = await Promise.all([geocode(originQ), geocode(destQ)]);
    const routed = await routeBetween(origin, destination, mode);
    const emissions = await emissionsFor(mode, routed.distanceKm, {
      provider: routed.provider,
      passengers,
      vehicle,
      cabinClass,
    });

    let durationMin = routed.durationMin;
    if (
      routed.provider === "haversine" &&
      emissions.travelTimeHours != null &&
      emissions.travelTimeHours > 0
    ) {
      durationMin = Math.max(1, Math.round(emissions.travelTimeHours * 60));
    }

    res.json({
      origin,
      destination,
      mode,
      distanceKm: routed.distanceKm,
      durationMin,
      polyline: routed.polyline,
      co2eKg: emissions.co2eKg,
      factor: emissions.factor,
      drivingCo2eKg: emissions.drivingCo2eKg,
      vsDrivingKg: emissions.vsDrivingKg,
      provider: routed.provider,
      strokeColor: routed.strokeColor,
      routerLabel: routed.routerLabel,
      note: routed.note ?? null,
      airports: routed.airports ?? null,
      connectors: routed.connectors ?? [],
    });
  } catch (err) {
    if (err instanceof GeocodeError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    if (err instanceof RoutingError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    next(err);
  }
});
