import cors from "cors";
import express from "express";
import { ZodError } from "zod";
import { pool } from "./db/client.js";
import { seed } from "./db/seed.js";
import { api } from "./http/routes.js";

const port = Number(process.env.PORT ?? 43124);
const app = express();

app.use(cors());
app.use(express.json());
app.use("/api", api);
app.get("/health", (_req, res) => {
  res.redirect(302, "/api/health");
});

app.use(
  (
    error: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    if (error instanceof ZodError) {
      res.status(400).json({ error: "Invalid request", details: error.flatten() });
      return;
    }
    const message = error instanceof Error ? error.message : "Server error";
    const status = message.startsWith("No active emission factor") ? 422 : 500;
    console.error(error);
    res.status(status).json({ error: message });
  },
);

async function start() {
  await seed();
  const server = app.listen(port, "0.0.0.0", () => {
    console.log(`CarbonRoute API listening on http://0.0.0.0:${port}`);
  });

  const shutdown = async () => {
    server.close();
    await pool.end();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
