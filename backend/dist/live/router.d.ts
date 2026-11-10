import { Router } from "express";
import type { PrismaClient } from "@prisma/client";
export declare function createLiveRouter(prisma: PrismaClient, diagnose: (id: string, t: "manual" | "monitor") => Promise<void>, startMonitoring: (id: string) => Promise<void>, stopMonitoring: (id: string) => void): Router;
export declare function createDiagnoser(prisma: PrismaClient): (serviceId: string, trigger: "manual" | "monitor") => Promise<void>;
//# sourceMappingURL=router.d.ts.map