import type { PrismaClient } from '@prisma/client';
export type RunStarter = (serviceId: string, trigger: 'monitor' | 'manual') => Promise<void>;
export declare class LiveScheduler {
    private readonly prisma;
    private readonly startRun;
    private readonly jobs;
    constructor(prisma: PrismaClient, startRun: RunStarter);
    reconcile(): Promise<void>;
    startAll(): Promise<void>;
    start(serviceId: string): Promise<void>;
    stop(serviceId: string): void;
    tick(serviceId: string): Promise<void>;
}
//# sourceMappingURL=scheduler.d.ts.map