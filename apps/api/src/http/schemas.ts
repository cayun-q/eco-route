import { FACTOR_SUBTYPES, TRAVEL_MODES } from "@carbonroute/shared";
import { z } from "zod";

const geoPoint = z.object({
  lat: z.number().gte(-90).lte(90),
  lng: z.number().gte(-180).lte(180),
});

export const estimateSchema = z.object({
  origin: z.string().trim().min(1).max(200),
  destination: z.string().trim().min(1).max(200),
  mode: z.enum(TRAVEL_MODES),
  subtype: z.enum(FACTOR_SUBTYPES).optional(),
  originCoords: geoPoint.nullish(),
  destCoords: geoPoint.nullish(),
  distanceMiles: z.number().nonnegative().optional(),
  durationMinutes: z.number().nonnegative().optional(),
});

export const createTripSchema = estimateSchema.extend({
  clientId: z.string().trim().min(8).max(80),
  loggedAt: z.string().datetime().optional(),
});
