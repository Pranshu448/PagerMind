import { EventEmitter } from "node:events";
import type { PrismaClient } from "@prisma/client";
export declare const liveEmitter: EventEmitter<any>;
export declare function liveLog(prisma: PrismaClient, runId: string, type: "info" | "error" | "success", content: string): Promise<void>;
//# sourceMappingURL=live-log.d.ts.map