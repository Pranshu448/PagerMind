import { EventEmitter } from 'node:events';
import type { PrismaClient } from '@prisma/client';
import { redact } from './security.js';
export const liveEmitter = new EventEmitter();
export async function liveLog(prisma: PrismaClient, runId: string, type: 'info'|'error'|'success', content: string): Promise<void> {
  const safe = redact(content); const event = await prisma.liveRunEvent.create({ data: { runId, type, content: safe } });
  liveEmitter.emit(`run:${runId}`, { id: event.id, type, content: safe, createdAt: event.createdAt });
}
