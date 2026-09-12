import { Router } from "express";
import { z } from "zod";
import { MODES, type Place } from "@carbonroute/shared";
import { geocode, GeocodeError } from "../services/geocode";
import { routeBetween } from "../services/routing";
import { emissionsFor } from "../services/emissions";
import { buildPlaneJourney } from "../services/multimodal";
import { airportPlace, lookupAirportByIata } from "../services/airportGraph";

export const estimateRouter = Router();

const bodySchema = z.object({
  origin: z.string().trim().min(1).max(200),
  destination: z.string().trim().min(1).max(200),
  mode: z.enum(MODES),
  direct: z.boolean().optional().default(false),
});

function leadingIata(value: string): string | null {
  const match = value.trim().match(/^([A-Za-z]{3})/);
  return match ? match[1].toUpperCase() : null;
}

async function resolveDirectFlightPlace(value: string): Promise<Place> {
  // Manual flight inputs may contain the full autocomplete display label.
  // Always try the first three letters as an IATA code first, e.g.
  // "AUS — Austin-Bergstrom International Airport, Austin" -> AUS.
  const code = leadingIata(value);
  if (code) {
    const airport = await lookupAirportByIata(code);
    if (airport) return airportPlace(airport);
  }
  return geocode(value);
}

estimateRouter.post("/", async (req, res, next) => {
  try {
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "origin, destination, and mode (car|plane) are required." });
      return;
    }
    const { origin: originQ, destination: destQ, mode, direct } = parsed.data;
    if (originQ.toLowerCase() === destQ.toLowerCase()) {
      res.status(400).json({ error: "Origin and destination need to be different places." });
      return;
    }

    const resolvePlace = mode === "plane" && direct ? resolveDirectFlightPlace : geocode;
    const [origin, destination] = await Promise.all([resolvePlace(originQ), resolvePlace(destQ)]);

    if (mode === "plane" && !direct) {
      const journey = await buildPlaneJourney(origin, destination);
      let co2eKg = 0;
      let planeFactor = null as Awaited<ReturnType<typeof emissionsFor>>["factor"] | null;
      for (const leg of journey.legs) {
        const emissions = await emissionsFor(leg.mode, leg.distanceKm);
        co2eKg += emissions.co2eKg;
        if (leg.mode === "plane" && !planeFactor) planeFactor = emissions.factor;
      }
      const roundedCo2eKg = Math.round(co2eKg * 1000) / 1000;
      const fallbackFactor = (await emissionsFor("plane", 0)).factor;

      // Compare the full multimodal itinerary against replacing the entire
      // journey with one car-only route between the user's actual endpoints.
      // Some trips (for example, across an ocean) have no drivable route, so
      // the comparison remains unavailable in that case.
      let drivingCo2eKg: number | null = null;
      let vsDrivingKg: number | null = null;
      try {
        const drivingRoute = await routeBetween(origin, destination, "car");
        const drivingEmissions = await emissionsFor("car", drivingRoute.distanceKm);
        drivingCo2eKg = drivingEmissions.co2eKg;
        vsDrivingKg = Math.round((roundedCo2eKg - drivingCo2eKg) * 1000) / 1000;
      } catch {
        drivingCo2eKg = null;
        vsDrivingKg = null;
      }

      res.json({
        origin,
        destination,
        mode,
        distanceKm: journey.distanceKm,
        durationMin: journey.durationMin,
        polyline: journey.polyline,
        legs: journey.legs,
        co2eKg: roundedCo2eKg,
        factor: planeFactor ?? fallbackFactor,
        drivingCo2eKg,
        vsDrivingKg,
        provider: "openflights",
      });
      return;
    }

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
