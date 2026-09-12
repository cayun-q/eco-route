import { Router } from "express";
import { loadFactors } from "../db";
import { factorToDto } from "../services/emissions";

export const factorsRouter = Router();

factorsRouter.get("/", async (_req, res, next) => {
  try {
    const rows = await loadFactors();
    res.json({ factors: rows.map(factorToDto) });
  } catch (err) {
    next(err);
  }
});
