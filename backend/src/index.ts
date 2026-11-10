import "dotenv/config";
import express from "express";
import { PrismaClient } from "@prisma/client";
import { validateLiveSecretKey } from "./live/security.js";

const app = express();
app.use(express.json());
const prisma = new PrismaClient();

if (
  !process.env.FRONTEND_ORIGIN ||
  !process.env.LIVE_API_TOKEN ||
  !process.env.LIVE_SECRET_KEY
) {
  console.error(
    "Live Mode requires FRONTEND_ORIGIN, LIVE_API_TOKEN, and LIVE_SECRET_KEY.",
  );
  process.exit(1);
}
validateLiveSecretKey();

const [{ createDiagnoser, createLiveRouter }, { LiveScheduler }] =
  await Promise.all([
    import("./live/router.js"),
    import("./live/scheduler.js"),
  ]);
const diagnoseLive = createDiagnoser(prisma);
const liveScheduler = new LiveScheduler(prisma, diagnoseLive);
await liveScheduler.reconcile();
await liveScheduler.startAll();
app.use(
  "/api/live",
  createLiveRouter(
    prisma,
    diagnoseLive,
    (serviceId) => liveScheduler.start(serviceId),
    (serviceId) => liveScheduler.stop(serviceId),
  ),
);

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () =>
  console.log(`PagerMind Live Mode listening on port ${port}`),
);
