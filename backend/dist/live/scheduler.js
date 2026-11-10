import { decryptSecret } from "./security.js";
import { serviceConfigSchema, } from "./types.js";
import { probeUrl } from "./probe.js";
export class LiveScheduler {
    prisma;
    startRun;
    jobs = new Map();
    constructor(prisma, startRun) {
        this.prisma = prisma;
        this.startRun = startRun;
    }
    async reconcile() {
        await this.prisma.liveRun.updateMany({
            where: { status: "RUNNING" },
            data: { status: "INTERRUPTED", completedAt: new Date() },
        });
    }
    async startAll() {
        const services = await this.prisma.liveService.findMany({
            select: { id: true },
        });
        await Promise.all(services.map((service) => this.start(service.id)));
    }
    async start(serviceId) {
        if (this.jobs.has(serviceId))
            return;
        const service = await this.prisma.liveService.findUniqueOrThrow({
            where: { id: serviceId },
        });
        const config = serviceConfigSchema.parse(JSON.parse(service.configJson));
        const runtime = {
            timer: setInterval(() => void this.tick(serviceId), config.checkIntervalMs),
            inFlight: false,
            failures: 0,
            successes: 0,
            state: service.monitorState,
        };
        this.jobs.set(serviceId, runtime);
        void this.tick(serviceId);
    }
    stop(serviceId) {
        const job = this.jobs.get(serviceId);
        if (job)
            clearInterval(job.timer);
        this.jobs.delete(serviceId);
    }
    async tick(serviceId) {
        const job = this.jobs.get(serviceId);
        if (!job || job.inFlight)
            return;
        job.inFlight = true;
        try {
            const service = await this.prisma.liveService.findUniqueOrThrow({
                where: { id: serviceId },
            });
            const config = serviceConfigSchema.parse(JSON.parse(service.configJson));
            const result = await probeUrl(config.healthUrl, config.probeTimeoutMs);
            if (result.ok) {
                job.successes++;
                job.failures = 0;
                if (job.state === "DOWN")
                    job.state = "RECOVERING";
                if (job.state === "RECOVERING" &&
                    job.successes >= config.recoveryThreshold)
                    job.state = "HEALTHY";
            }
            else {
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
        }
        finally {
            job.inFlight = false;
        }
    }
}
//# sourceMappingURL=scheduler.js.map