import { EventEmitter } from 'node:events';
import { redact } from './security.js';
export const liveEmitter = new EventEmitter();
export async function liveLog(prisma, runId, type, content) {
    const safe = redact(content);
    const event = await prisma.liveRunEvent.create({ data: { runId, type, content: safe } });
    liveEmitter.emit(`run:${runId}`, { id: event.id, type, content: safe, createdAt: event.createdAt });
}
//# sourceMappingURL=live-log.js.map