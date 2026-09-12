import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
dotenv.config({ path: path.join(rootDir, ".env") });
dotenv.config();
import cors from "cors";
import express from "express";
import { migrateAndSeed, pool } from "./db";
import { estimateRouter } from "./routes/estimate";
import { factorsRouter } from "./routes/factors";
import { geocodeRouter } from "./routes/geocode";
import { statsRouter } from "./routes/stats";
import { tripsRouter } from "./routes/trips";

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true, db: true });
  } catch {
    res.status(503).json({ ok: false, db: false });
  }
});

app.use("/api/factors", factorsRouter);
app.use("/api/geocode", geocodeRouter);
app.use("/api/routes/estimate", estimateRouter);
app.use("/api/trips", tripsRouter);
app.use("/api/stats", statsRouter);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const status = typeof err === "object" && err && "status" in err ? Number((err as { status: number }).status) : 500;
  const message = err instanceof Error ? err.message : "Server error";
  console.error(err);
  res.status(status || 500).json({ error: message });
});

const port = Number(process.env.PORT ?? 43124);

async function main() {
  await migrateAndSeed();
  app.listen(port, "0.0.0.0", () => {
    console.log(`CarbonRoute API on http://127.0.0.1:${port}`);
  });
}

main().catch((err) => {
  console.error("Failed to start API", err);
  process.exit(1);
});
