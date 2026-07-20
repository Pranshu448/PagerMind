import { PrismaClient } from '@prisma/client';
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
// import { StrandsAgent } from "strands-sdk"; // Pseudo-import for Strands
const prisma = new PrismaClient();
export async function spawnAgentLoop(incidentId, serviceName) {
    console.log(`[Incident ${incidentId}] Spawning Strands Agent...`);
    // 1. Update State
    await prisma.incident.update({
        where: { id: incidentId },
        data: { status: 'INVESTIGATING' }
    });
    // 2. Connect the "Brain" to the "Hands" (MCP Server)
    // We use Node to spin up the local MCP server we built earlier
    const transport = new StdioClientTransport({
        command: "npx",
        args: ["tsx", "../mcp-server/src/server.ts"] // Path to your MCP server
    });
    const mcpClient = new Client({ name: "pagermind-agent", version: "1.0.0" }, { capabilities: {} });
    await mcpClient.connect(transport);
    // Fetch available tools from the MCP server
    const toolMenu = await mcpClient.listTools();
    console.log(`[Agent] Connected to MCP. Available Tools:`, toolMenu.tools.map(t => t.name));
    /*
     3. The Strands Prompt & Loop
     Here, you initialize your Strands agent, passing in the MCP tools.
     
     System Prompt:
     "You are an SRE Incident Agent investigating a crash in ${serviceName}.
     1. Use 'read_simulated_logs' to find the error stack trace.
     2. Use 'get_git_diff' to analyze the most recent code changes.
     3. Correlate the code change to the error log.
     4. Stop and request human approval. DO NOT execute rollbacks yourself."
    */
    console.log(`[Agent] Running Triage Loop...`);
    // --- SIMULATED AGENT LOOP OUTPUT ---
    // In a real run, Strands would execute these tools automatically.
    // const logs = await mcpClient.callTool({ name: "read_simulated_logs" });
    // const diff = await mcpClient.callTool({ name: "get_git_diff" });
    // 4. Pause for Human Approval
    await prisma.incident.update({
        where: { id: incidentId },
        data: {
            status: 'PENDING_APPROVAL',
            rootCause: "Database connection failed because port was changed to 5433 in recent commit."
        }
    });
    console.log(`[Agent] Investigation paused. Awaiting human approval via Dashboard.`);
}
//# sourceMappingURL=orchestrator.js.map