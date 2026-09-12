import { Router } from "express";
import { listActiveFactors } from "../services/factors.js";
import { estimateEmissions } from "../services/calculator.js";
import { routingProvider } from "../services/routing/index.js";
import { createTrip, getSummary, getTrip, listTrips } from "../services/trips.js";
import { createTripSchema, estimateSchema } from "./schemas.js";

export const api = Router();

api.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "carbonroute-api",
    routingProvider: routingProvider.name,
  });
});

api.get("/emission-factors", async (_req, res, next) => {
  try {
    res.json({ factors: await listActiveFactors() });
  } catch (error) {
    next(error);
  }
});

api.post("/routes/estimate", async (req, res, next) => {
  try {
    const input = estimateSchema.parse(req.body);
    res.json(await estimateEmissions(input));
  } catch (error) {
    next(error);
  }
});

api.post("/trips", async (req, res, next) => {
  try {
    const input = createTripSchema.parse(req.body);
    const trip = await createTrip(input);
    res.status(201).json(trip);
  } catch (error) {
    next(error);
  }
});

api.get("/trips/summary", async (_req, res, next) => {
  try {
    res.json(await getSummary());
  } catch (error) {
    next(error);
  }
});

api.get("/trips", async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    res.json({ trips: await listTrips(limit) });
  } catch (error) {
    next(error);
  }
});

api.get("/trips/:id", async (req, res, next) => {
  try {
    const trip = await getTrip(req.params.id);
    if (!trip) {
      res.status(404).json({ error: "Trip not found" });
      return;
    }
    res.json(trip);
  } catch (error) {
    next(error);
  }
});
