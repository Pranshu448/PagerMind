import type { PrismaClient } from "@prisma/client";
import { decryptSecret } from "./security.js";
import {
  serviceConfigSchema,
  type LiveSecrets,
  type ServiceConfig,
} from "./types.js";
import { probeUrl } from "./probe.js";

export type RunStarter = (
  serviceId: string,
  trigger: "monitor" | "manual",
) => Promise<void>;
type Runtime = {
  timer: NodeJS.Timeout;
  inFlight: boolean;
  failures: number;
  successes: number;
  state: "HEALTHY" | "SUSPECT" | "DOWN" | "RECOVERING";
};
export class LiveScheduler {
  private readonly jobs = new Map<string, Runtime>();
  constructor(
    private readonly prisma: PrismaClient,
    private readonly startRun: RunStarter,
  ) {}
  async reconcile(): Promise<void> {
    await this.prisma.liveRun.updateMany({
      where: { status: "RUNNING" },
      data: { status: "INTERRUPTED", completedAt: new Date() },
    });
  }
  async startAll(): Promise<void> {
    const services = await this.prisma.liveService.findMany({
      select: { id: true },
    });
    await Promise.all(services.map((service) => this.start(service.id)));
  }
  async start(serviceId: string): Promise<void> {
    if (this.jobs.has(serviceId)) return;
    const service = await this.prisma.liveService.findUniqueOrThrow({
      where: { id: serviceId },
    });
    const config = serviceConfigSchema.parse(JSON.parse(service.configJson));
    const runtime: Runtime = {
      timer: setInterval(
        () => void this.tick(serviceId),
        config.checkIntervalMs,
      ),
      inFlight: false,
      failures: 0,
      successes: 0,
      state: service.monitorState as Runtime["state"],
    };
    this.jobs.set(serviceId, runtime);
    void this.tick(serviceId);
  }
  stop(serviceId: string): void {
    const job = this.jobs.get(serviceId);
    if (job) clearInterval(job.timer);
    this.jobs.delete(serviceId);
  }
  async tick(serviceId: string): Promise<void> {
    const job = this.jobs.get(serviceId);
    if (!job || job.inFlight) return;
    job.inFlight = true;
    try {
      const service = await this.prisma.liveService.findUniqueOrThrow({
        where: { id: serviceId },
      });
      const config: ServiceConfig = serviceConfigSchema.parse(
        JSON.parse(service.configJson),
      );
      const result = await probeUrl(config.healthUrl, config.probeTimeoutMs);
      if (result.ok) {
        job.successes++;
        job.failures = 0;
        if (job.state === "DOWN") job.state = "RECOVERING";
        if (
          job.state === "RECOVERING" &&
          job.successes >= config.recoveryThreshold
        )
          job.state = "HEALTHY";
      } else {
        job.failures++;
        job.successes = 0;
        job.state =
          job.failures >= config.failureThreshold ? "DOWN" : "SUSPECT";
        if (job.state === "DOWN" && job.failures === config.failureThreshold)
          await this.startRun(serviceId, "monitor");
      }
      await this.prisma.liveService.update({
        where: { id: serviceId },
        data: { monitorState: job.state },
      });
    } finally {
      job.inFlight = false;
    }
  }
}
