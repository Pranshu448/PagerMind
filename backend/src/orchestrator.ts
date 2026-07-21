import { PrismaClient } from '@prisma/client';
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import 'dotenv/config';

const prisma = new PrismaClient();

export async function spawnAgentLoop(incidentId: string, serviceName: string) {
  console.log(`\n[Incident ${incidentId}] 🚨 Waking up AI Triage Agent...`);

  // 1. Update State to Investigating
  await prisma.incident.update({
    where: { id: incidentId },
    data: { status: 'INVESTIGATING' }
  });

  const ollamaUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
  const ollamaModel = process.env.OLLAMA_MODEL || 'qwen2.5-coder:3b';

  console.log(`[Agent] Configuration:`);
  console.log(`  - Ollama Base URL: ${ollamaUrl}`);
  console.log(`  - Ollama Model: ${ollamaModel}`);

  let mcpClient: Client | null = null;

  try {
    // 2. Connect the AI to its "Hands" (Your MCP Server)
    console.log(`[Agent] Connecting to local MCP server...`);
    const transport = new StdioClientTransport({
      command: "npx",
      args: ["tsx", "../mcp-server/src/server.ts"] 
    });
    
    mcpClient = new Client({ name: "pagermind-agent", version: "1.0.0" }, { capabilities: {} });
    await mcpClient.connect(transport);
    console.log(`[Agent] Connected to MCP server.`);

    // 3. Fetch evidence using the real MCP tools
    console.log(`[Agent] Fetching simulated logs using MCP...`);
        const logsResult = (await mcpClient.callTool({
      name: "read_simulated_logs",
      arguments: {}
    })) as any;

    const logsText = logsResult.content && logsResult.content[0] && logsResult.content[0].type === "text"
      ? logsResult.content[0].text
      : "No log content retrieved.";
    
    console.log(`[Agent] Simulated logs successfully fetched (${logsText.length} characters).`);

    console.log(`[Agent] Fetching git diff using MCP...`);
    const diffResult = (await mcpClient.callTool({
      name: "get_git_diff",
      arguments: {}
    })) as any;

    const diffText = diffResult.content && diffResult.content[0] && diffResult.content[0].type === "text"
      ? diffResult.content[0].text
      : "No git diff retrieved.";

    console.log(`[Agent] Git diff successfully fetched (${diffText.length} characters).`);

    // 4. Construct prompt and call local Ollama HTTP API
    console.log(`[Agent] Preparing prompt and sending to Ollama model '${ollamaModel}'...`);

    const systemPrompt = `You are an elite Site Reliability Engineer (SRE) investigating a production outage for the service: ${serviceName}.
Analyze only the provided evidence from logs and Git diff to explain the likely root cause concisely.
Avoid claiming certainty when the evidence is insufficient.
Format your output as a concise, 2-sentence summary of the root cause and the specific commit or line that caused it.
Do NOT suggest rollbacks or actions. Just state the root cause and change details based on the logs and diff.`;

    const userPrompt = `Here is the evidence collected:

1. SIMULATED LOGS:
${logsText}

2. GIT DIFF:
${diffText}

Based on the evidence, what is the root cause?`;

    const prompt = `${systemPrompt}\n\n${userPrompt}`;

    const startTime = Date.now();
    const ollamaResponse = await fetch(`${ollamaUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: ollamaModel,
        prompt: prompt,
        stream: false
      })
    });

    if (!ollamaResponse.ok) {
      throw new Error(`Ollama request failed with status ${ollamaResponse.status}: ${ollamaResponse.statusText}`);
    }

    const data = await ollamaResponse.json() as { response: string };
    const diagnosis = data.response ? data.response.trim() : "";
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    if (!diagnosis) {
      throw new Error("Ollama returned an empty response.");
    }

    console.log(`[Agent] Ollama completed in ${duration}s. Diagnosis:\n"${diagnosis}"\n`);

    // 5. Save the Agent's actual findings to the Database and wait for human approval
    await prisma.incident.update({
      where: { id: incidentId },
      data: { 
        status: 'PENDING_APPROVAL',
        rootCause: diagnosis
      }
    });

    console.log(`[Agent] Incident locked in PENDING_APPROVAL. Awaiting human input.`);

  } catch (error: any) {
    console.error(`[Agent] Fatal error during SRE investigation:`, error);
    
    // Fallback: If Ollama fails, mark the incident as FAILED with the error details
    const failReason = `Agent failed: ${error.message || error}`;
    await prisma.incident.update({
      where: { id: incidentId },
      data: { 
        status: 'FAILED', 
        rootCause: failReason 
      }
    });
    console.log(`[Agent] Incident ${incidentId} marked as FAILED in database.`);
  } finally {
    if (mcpClient) {
      try {
        await mcpClient.close();
        console.log(`[Agent] MCP server connection closed.`);
      } catch (closeError) {
        console.error(`[Agent] Error closing MCP server connection:`, closeError);
      }
    }
  }
}