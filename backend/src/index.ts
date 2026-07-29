import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { spawnAgentLoop } from './orchestrator.js';
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { agentLog, logEmitter, getIncidentLogs, clearIncidentLogs } from './logger.js';

const app = express();
app.use(cors());
app.use(express.json());
const prisma = new PrismaClient();

// 1. Get all incidents (sorted by creation time descending)
app.get('/api/incidents', async (req, res) => {
  try {
    const incidents = await prisma.incident.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.status(200).json(incidents);
  } catch (error: any) {
    console.error("Error fetching incidents:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// 2. Spawn SRE investigation loop manually (Webhook alert mock trigger)
app.post('/api/alerts', async (req, res) => {
  const { serviceName } = req.body;

  if (!serviceName) {
    res.status(400).json({ error: "serviceName is required" });
    return;
  }

  try {
    // Idempotency Check: Are we already fixing this service?
    const existingIncident = await prisma.incident.findFirst({
      where: { 
        serviceName, 
        status: { in: ['DETECTED', 'INVESTIGATING', 'PENDING_APPROVAL'] } 
      }
    });

    if (existingIncident) {
      res.status(200).json({ message: "Incident already being handled.", incidentId: existingIncident.id });
      return;
    }

    // Lock the Incident
    const incident = await prisma.incident.create({
      data: { serviceName, status: 'DETECTED' }
    });

    // Hand off to the Orchestrator
    res.status(202).json({ message: "Agent spawned.", incidentId: incident.id });
    
    // Clear any previous logs for this incident
    clearIncidentLogs(incident.id);

    // Fire-and-forget: spawn the agent loop in the background
    spawnAgentLoop(incident.id, serviceName).catch(console.error);
  } catch (error: any) {
    console.error("Error triggering alert:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// 3. Approve incident rollback (Human-in-the-loop manual action)
app.post('/api/incidents/:id/approve', async (req, res) => {
  const { id } = req.params;

  agentLog(id, `[Approval API] Received rollback approval request for incident ${id}`);

  try {
    // Find the incident
    const incident = await prisma.incident.findUnique({
      where: { id }
    });

    if (!incident) {
      res.status(404).json({ error: "Incident not found" });
      return;
    }

    if (incident.status !== 'PENDING_APPROVAL' && incident.status !== 'FAILED' && incident.status !== 'DETECTED') {
      res.status(400).json({ error: `Cannot approve rollback for incident in status: ${incident.status}` });
      return;
    }

    // Connect to the MCP Server to run the rollback tool
    agentLog(id, `[Approval API] Connecting to local MCP server to execute rollback...`);
    const transport = new StdioClientTransport({
      command: "npx",
      args: ["tsx", "../mcp-server/src/server.ts"]
    });

    const mcpClient = new Client({ name: "pagermind-approval", version: "1.0.0" }, { capabilities: {} });
    await mcpClient.connect(transport);
    agentLog(id, `[Approval API] Connected to MCP server. Resolving recommended recovery action...`);

    let recoveryTool = "rollback_deployment";
    let recoveryArgs: any = { deployment_name: "api" };

    if (incident.recovery === "restart_pod") {
      recoveryTool = "restart_pod";
      recoveryArgs = { pod_name: "api" };
    } else if (incident.recovery === "scale_deployment") {
      recoveryTool = "scale_deployment";
      recoveryArgs = { deployment_name: "api", replicas: 5 };
    }

    agentLog(id, `[Approval API] Executing recovery action '${recoveryTool}' with args: ${JSON.stringify(recoveryArgs)}`);

    let rollbackMessage = "";
    try {
      const rollbackResult = (await mcpClient.callTool({
        name: recoveryTool,
        arguments: recoveryArgs
      })) as any;

      rollbackMessage = rollbackResult.content && rollbackResult.content[0] && rollbackResult.content[0].type === "text"
        ? rollbackResult.content[0].text
        : "Recovery finished with no output.";

      // Clear SRE incident memory upon successful rollback
      try {
        await mcpClient.callTool({
          name: "clear_memory",
          arguments: {}
        });
        agentLog(id, `[Approval API] SRE Incident memory cleared successfully.`, 'success');
      } catch (memError: any) {
        agentLog(id, `[Approval API] Warning: Failed to clear SRE memory: ${memError.message || memError}`, 'error');
      }
    } finally {
      await mcpClient.close();
      agentLog(id, `[Approval API] MCP connection closed.`);
    }

    agentLog(id, `[Approval API] Rollback successful: ${rollbackMessage}`, 'success');

    // Update state to RESOLVED
    const updatedIncident = await prisma.incident.update({
      where: { id },
      data: { 
        status: 'RESOLVED',
        rootCause: incident.rootCause ? `${incident.rootCause}\n\n[Human Approved Rollback Output]: ${rollbackMessage}` : `[Rollback Output]: ${rollbackMessage}`
      }
    });

    res.status(200).json({
      message: "Rollback executed successfully. Incident resolved.",
      incident: updatedIncident
    });

  } catch (error: any) {
    agentLog(id, `[Approval API] Error during rollback approval: ${error.message || error}`, 'error');
    res.status(500).json({ error: `Rollback execution failed: ${error.message}` });
  }
});

// 4. Dismiss incident (Cancel alert)
app.post('/api/incidents/:id/dismiss', async (req, res) => {
  const { id } = req.params;

  agentLog(id, `[Dismiss API] Received request to dismiss incident ${id}`);

  try {
    const incident = await prisma.incident.findUnique({
      where: { id }
    });

    if (!incident) {
      res.status(404).json({ error: "Incident not found" });
      return;
    }

    const updatedIncident = await prisma.incident.update({
      where: { id },
      data: {
        status: 'FAILED',
        rootCause: incident.rootCause 
          ? `${incident.rootCause}\n\n[Dismissed by Operator]: Incident was manually cancelled.`
          : '[Dismissed by Operator]: Incident was manually cancelled.'
      }
    });

    res.status(200).json({
      message: "Incident alert successfully dismissed.",
      incident: updatedIncident
    });
  } catch (error: any) {
    agentLog(id, `[Dismiss API] Error dismissing incident: ${error.message || error}`, 'error');
    res.status(500).json({ error: `Failed to dismiss incident: ${error.message}` });
  }
});

// 5. Server-Sent Events (SSE) stream for real-time SRE logs
app.get('/api/incidents/:id/logs/stream', (req, res) => {
  const { id } = req.params;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Send any existing cached logs immediately so the client catches up on refresh
  const history = getIncidentLogs(id);
  for (const logItem of history) {
    res.write(`data: ${JSON.stringify(logItem)}\n\n`);
  }

  const onLog = (data: any) => {
    if (data.incidentId === id) {
      res.write(`data: ${JSON.stringify({ text: data.text, type: data.type })}\n\n`);
    }
  };

  logEmitter.on('log', onLog);

  req.on('close', () => {
    logEmitter.off('log', onLog);
    res.end();
  });
});

// 6. Clear all resolved incidents
app.delete('/api/incidents/resolved', async (req, res) => {
  console.log(`[Clear API] Received request to delete all resolved alerts`);
  try {
    // Find all resolved incidents to clear their logs
    const resolved = await prisma.incident.findMany({
      where: { status: 'RESOLVED' }
    });
    for (const inc of resolved) {
      clearIncidentLogs(inc.id);
    }

    const deleted = await prisma.incident.deleteMany({
      where: { status: 'RESOLVED' }
    });
    res.status(200).json({ 
      message: `Cleared ${deleted.count} resolved alerts.`,
      count: deleted.count 
    });
  } catch (error: any) {
    console.error(`[Clear API] Error clearing resolved alerts:`, error);
    res.status(500).json({ error: `Failed to clear resolved alerts: ${error.message}` });
  }
});

// 7. Delete a specific incident
app.delete('/api/incidents/:id', async (req, res) => {
  const { id } = req.params;
  console.log(`[Delete API] Received request to delete incident ${id}`);
  try {
    clearIncidentLogs(id);
    await prisma.incident.delete({
      where: { id }
    });
    res.status(200).json({ message: "Incident successfully deleted." });
  } catch (error: any) {
    console.error(`[Delete API] Error deleting incident:`, error);
    res.status(500).json({ error: `Failed to delete incident: ${error.message}` });
  }
});

app.listen(3000, () => console.log('PagerMind Gateway running on port 3000'));
