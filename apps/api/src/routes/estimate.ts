import { Router } from "express";
import { z } from "zod";
import { MODES, type Place, type TransportMode } from "@carbonroute/shared";
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
  const code = leadingIata(value);
  if (code) {
    const airport = await lookupAirportByIata(code);
    if (airport) return airportPlace(airport);
  }
  return geocode(value);
}

async function planeJourneyEmissions(origin: Place, destination: Place) {
  const journey = await buildPlaneJourney(origin, destination);
  let co2eKg = 0;
  let planeFactor = null as Awaited<ReturnType<typeof emissionsFor>>["factor"] | null;
  for (const leg of journey.legs) {
    const emissions = await emissionsFor(leg.mode, leg.distanceKm);
    co2eKg += emissions.co2eKg;
    if (leg.mode === "plane" && !planeFactor) planeFactor = emissions.factor;
  }
  return { journey, co2eKg: Math.round(co2eKg * 1000) / 1000, planeFactor };
}

estimateRouter.post("/", async (req, res, next) => {
  try {
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "origin, destination, and a valid transport mode are required." });
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
      const { journey, co2eKg: roundedCo2eKg, planeFactor } = await planeJourneyEmissions(origin, destination);
      const fallbackFactor = (await emissionsFor("plane", 0)).factor;
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
        origin, destination, mode,
        distanceKm: journey.distanceKm,
        durationMin: journey.durationMin,
        polyline: journey.polyline,
        legs: journey.legs,
        co2eKg: roundedCo2eKg,
        factor: planeFactor ?? fallbackFactor,
        drivingCo2eKg,
        vsDrivingKg,
        comparisonMode: drivingCo2eKg == null ? null : "car",
        comparisonCo2eKg: drivingCo2eKg,
        vsComparisonKg: vsDrivingKg,
        provider: "openflights",
      });
      return;
    }

    const routed = await routeBetween(origin, destination, mode);
    const emissions = await emissionsFor(mode, routed.distanceKm);
    let comparisonMode: TransportMode | null = null;
    let comparisonCo2eKg: number | null = null;
    let vsComparisonKg: number | null = null;

    try {
      const plane = await planeJourneyEmissions(origin, destination);
      comparisonMode = "plane";
      comparisonCo2eKg = plane.co2eKg;
      vsComparisonKg = Math.round((emissions.co2eKg - comparisonCo2eKg) * 1000) / 1000;
    } catch {
      comparisonMode = null;
      comparisonCo2eKg = null;
      vsComparisonKg = null;
    }

    res.json({
      origin, destination, mode,
      distanceKm: routed.distanceKm,
      durationMin: routed.durationMin,
      polyline: routed.polyline,
      co2eKg: emissions.co2eKg,
      factor: emissions.factor,
      drivingCo2eKg: emissions.drivingCo2eKg,
      vsDrivingKg: emissions.vsDrivingKg,
      comparisonMode,
      comparisonCo2eKg,
      vsComparisonKg,
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
