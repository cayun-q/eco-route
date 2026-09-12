import { Router } from "express";
import { searchPlaces } from "../services/geocode";

export const geocodeRouter = Router();

geocodeRouter.get("/search", async (req, res, next) => {
  try {
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    if (q.length < 3) {
      res.json({ places: [] });
      return;
    }
    const places = await searchPlaces(q, 6);
    res.json({ places });
  } catch (err) {
    next(err);
  }
});
