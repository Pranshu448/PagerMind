import express from 'express';
import { PrismaClient } from '@prisma/client';
import { spawnAgentLoop } from './orchestrator.js';
const app = express();
app.use(express.json());
const prisma = new PrismaClient();
app.post('/api/alerts', async (req, res) => {
    const { serviceName } = req.body;
    // 1. Idempotency Check: Are we already fixing this service?
    const existingIncident = await prisma.incident.findFirst({
        where: {
            serviceName,
            status: { in: ['DETECTED', 'INVESTIGATING', 'PENDING_APPROVAL'] }
        }
    });
    if (existingIncident) {
        res.status(200).json({ message: "Incident already being handled." });
        return;
    }
    // 2. Lock the Incident
    const incident = await prisma.incident.create({
        data: { serviceName, status: 'DETECTED' }
    });
    // 3. Hand off to the Orchestrator
    res.status(202).json({ message: "Agent spawned.", incidentId: incident.id });
    // Fire-and-forget: spawn the agent loop in the background
    spawnAgentLoop(incident.id, serviceName).catch(console.error);
});
app.listen(3000, () => console.log('PagerMind Gateway running on port 3000'));
//# sourceMappingURL=index.js.map