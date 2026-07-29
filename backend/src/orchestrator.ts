import { PrismaClient } from '@prisma/client';
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import 'dotenv/config';
import { agentLog } from './logger.js';

const prisma = new PrismaClient();

export async function spawnAgentLoop(incidentId: string, serviceName: string) {
  agentLog(incidentId, `[Incident ${incidentId}] 🚨 Waking up AI Triage Agent...`, 'info');

  // 1. Update State to Investigating
  await prisma.incident.update({
    where: { id: incidentId },
    data: { status: 'INVESTIGATING' }
  });

  const ollamaUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
  const ollamaModel = process.env.OLLAMA_MODEL || 'qwen2.5-coder:3b';

  agentLog(incidentId, `[Agent] Configuration:`);
  agentLog(incidentId, `  - Ollama Base URL: ${ollamaUrl}`);
  agentLog(incidentId, `  - Ollama Model: ${ollamaModel}`);

  let mcpClient: Client | null = null;

  try {
    // 2. Connect the AI to its "Hands" (Your MCP Server)
    agentLog(incidentId, `[Agent] Connecting to local MCP server...`);
    const transport = new StdioClientTransport({
      command: "npx",
      args: ["tsx", "../mcp-server/src/server.ts"] 
    });
    
    mcpClient = new Client({ name: "pagermind-agent", version: "1.0.0" }, { capabilities: {} });
    await mcpClient.connect(transport);
    agentLog(incidentId, `[Agent] Connected to MCP server.`, 'success');

    // 3. Dynamic Multi-Turn SRE Investigation Loop
    const systemPrompt = `You are an elite Site Reliability Engineer (SRE) agent investigating a production outage for the service: ${serviceName}.
Your goal is to find the root cause, determine a confidence score, and recommend a recovery action.

You have access to the following tools:
1. "read_simulated_logs" - Reads the latest container logs of the API to inspect crashes or stack traces.
2. "get_git_diff" - Retrieves the exact code changes from the most recent deployment commit.
3. "get_recent_commit" - Retrieves details (hash, author, date, message) of the latest commit.
4. "get_cpu" - Retrieves current CPU utilization of the API container.
5. "get_memory" - Retrieves current Memory utilization of the API container.
6. "get_latency" - Retrieves average transaction latency.
7. "get_error_rate" - Retrieves average HTTP error rate.
8. "retrieve_memory" - Reads short-term SRE memory.
9. "store_fact" - Stores key-value facts (arguments: key, value).
10. "clear_memory" - Clears SRE memory.

Guidelines:
- Inspect CPU, memory, and database metrics systematically to rule out resource constraints before accusing Git commits.
- Call "retrieve_memory" at the start to check if there are facts saved from previous runs.
- Call "store_fact" to save important findings so you don't repeat checks.
- Keep thoughts focused and run tool calls one at a time.
- Output MUST be a valid JSON object matching one of the two structures:

  Format A (To call a tool):
  {
    "thought": "Reasoning about what we need to inspect next and why.",
    "call": {
      "name": "tool_name",
      "arguments": {}
    }
  }

  Format B (To finish and declare diagnosis):
  {
    "thought": "Reasoning summarizing the collected facts and final decision.",
    "finish": {
      "diagnosis": "Markdown explanation of root cause.",
      "confidence": 0.95,
      "recovery": "rollback_deployment" // MUST be one of: "rollback_deployment", "restart_pod", "scale_deployment"
    }
  }

=== ONE-SHOT EXAMPLE OF COMPLIANT TRIAGE RUN ===
Turn 1:
AGENT: { "thought": "I should retrieve memory first to check for any existing facts.", "call": { "name": "retrieve_memory", "arguments": {} } }
USER: Tool 'retrieve_memory' output: {}

Turn 2:
AGENT: { "thought": "No previous memory. I will check the CPU and Memory metrics.", "call": { "name": "get_cpu", "arguments": {} } }
USER: Tool 'get_cpu' output: {"cpu_utilization": "12%", "status": "Normal"}

Turn 3:
AGENT: { "thought": "CPU is normal. Let's read the container logs.", "call": { "name": "read_simulated_logs", "arguments": {} } }
USER: Tool 'read_simulated_logs' output: "HEALTH CHECK FAILURE: Connection refused to database at postgres:5432"

Turn 4:
AGENT: { "thought": "Logs show database connection failure. I will check error rate and latency.", "call": { "name": "get_error_rate", "arguments": {} } }
USER: Tool 'get_error_rate' output: {"error_rate": "100.0%", "status": "Critical"}

Turn 5:
AGENT: { "thought": "Error rate is 100% and database is offline. I will check if any recent changes were committed.", "call": { "name": "get_git_diff", "arguments": {} } }
USER: Tool 'get_git_diff' output: "No committed changes found."

Turn 6:
AGENT: { "thought": "No git changes, but database container is offline. I need to restart the DB.", "finish": { "diagnosis": "Outage caused by PostgreSQL container being stopped.", "confidence": 0.95, "recovery": "restart_pod" } }
=== END OF EXAMPLE ===

Output ONLY the JSON object. Do not include markdown codeblocks or extra characters.`;

    let history: { role: string; content: string }[] = [];
    history.push({
      role: 'user',
      content: `Outage incident alert received for ${serviceName}. Begin step-by-step investigation using SRE tools.`
    });

    let turn = 0;
    let finished = false;
    let finalDiagnosis = "";
    let finalConfidence = 0.0;
    let finalRecovery = "rollback_deployment";

    while (turn < 12 && !finished) {
      agentLog(incidentId, `[Agent] SRE Investigation Turn ${turn + 1}...`);
      
      const conversationText = history.map(h => `${h.role === 'user' ? 'USER' : 'AGENT'}: ${h.content}`).join("\n\n");
      const fullPrompt = `${systemPrompt}\n\n=== CONVERSATION HISTORY ===\n${conversationText}\n\nAGENT:`;

      const startTime = Date.now();
      const ollamaResponse = await fetch(`${ollamaUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: ollamaModel,
          prompt: fullPrompt,
          format: "json", // Instruct Ollama to output valid JSON
          stream: false
        })
      });

      if (!ollamaResponse.ok) {
        throw new Error(`Ollama request failed: ${ollamaResponse.statusText}`);
      }

      const resData = await ollamaResponse.json() as { response: string };
      const resText = resData.response ? resData.response.trim() : "";
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      
      agentLog(incidentId, `[Agent] Ollama thought completed in ${duration}s.`);
      agentLog(incidentId, `[Agent] Response payload:\n${resText}\n`);

      let action: any;
      try {
        action = JSON.parse(resText);
        
        // --- Normalizer rules for smaller local models (e.g. Qwen) ---
        
        // 1. Map { action: { type: "finish", message: "..." } } to standard finish schema
        if (action.action && action.action.type === 'finish') {
          action.finish = {
            diagnosis: action.action.message || action.action.description || "Root cause identified.",
            confidence: action.action.confidence || 0.9,
            recovery: action.action.recovery || "rollback_deployment"
          };
        }
        
        // 2. Map { status: "complete" } to standard finish schema
        if (action.status === 'complete' || action.status === 'success') {
          action.finish = {
            diagnosis: action.diagnosis || action.message || "Triage complete.",
            confidence: action.confidence || 0.95,
            recovery: action.recovery || "rollback_deployment"
          };
        }
        
        // 3. Fallback: If it's a finish block but lacks a recovery action, default to rollback
        if (action.finish && !action.finish.recovery) {
          action.finish.recovery = "rollback_deployment";
        }
      } catch (err) {
        agentLog(incidentId, "[Agent] JSON parsing failed, prompting correction...", 'error');
        history.push({
          role: 'user',
          content: "Error: Your response could not be parsed as valid JSON. Please reply with a valid JSON object matching the requested schema."
        });
        turn++;
        continue;
      }

      // Add agent response to conversation history
      history.push({
        role: 'assistant',
        content: resText
      });

      if (action.call) {
        const { name: toolName, arguments: toolArgs } = action.call;
        agentLog(incidentId, `[Agent] Executing tool call: ${toolName}...`);

        let toolOutputText = "";
        try {
          const toolResult = (await mcpClient.callTool({
            name: toolName,
            arguments: toolArgs || {}
          })) as any;

          toolOutputText = toolResult.content && toolResult.content[0] && toolResult.content[0].type === "text"
            ? toolResult.content[0].text
            : JSON.stringify(toolResult);
        } catch (toolError: any) {
          toolOutputText = `Error executing tool: ${toolError.message || toolError}`;
        }

        agentLog(incidentId, `[Agent] Tool '${toolName}' execution complete (${toolOutputText.length} characters).`, 'success');
        history.push({
          role: 'user',
          content: `Tool '${toolName}' output:\n${toolOutputText}`
        });
      } 
      
      else if (action.finish) {
        const { diagnosis, confidence, recovery } = action.finish;
        finalDiagnosis = diagnosis || "Root cause unknown.";
        finalConfidence = parseFloat(confidence || 0);
        finalRecovery = recovery || "rollback_deployment";
        finished = true;
      } 
      
      else {
        history.push({
          role: 'user',
          content: "Error: Action format not recognized. You must specify either a 'call' object or a 'finish' object in your JSON."
        });
      }

      turn++;
    }

    if (!finished) {
      agentLog(incidentId, "[Agent] Warning: SRE investigation loop exceeded maximum turns. Summarizing findings...", 'error');
      const conversationText = history.map(h => `${h.role === 'user' ? 'USER' : 'AGENT'}: ${h.content}`).join("\n\n");
      const summaryPrompt = `${conversationText}\n\nUSER: Based on the SRE investigation history above, summarize the root cause of the outage and recommend a recovery action (rollback_deployment, restart_pod, scale_deployment). Keep the summary clear, professional and under 4 sentences.`;

      try {
        const response = await fetch(`${ollamaUrl}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: ollamaModel,
            prompt: summaryPrompt,
            stream: false
          })
        });
        if (response.ok) {
          const resData = await response.json() as { response: string };
          finalDiagnosis = resData.response ? resData.response.trim() : "SRE investigation timed out.";
          finalConfidence = 0.8;
          finalRecovery = "rollback_deployment";
        }
      } catch (err) {
        finalDiagnosis = "Agent timed out. Outage was unresolved.";
        finalConfidence = 0.1;
        finalRecovery = "rollback_deployment";
      }
    }

    // 5. Save the SRE agent findings to SQLite database
    await prisma.incident.update({
      where: { id: incidentId },
      data: { 
        status: 'PENDING_APPROVAL',
        rootCause: finalDiagnosis,
        confidence: finalConfidence,
        recovery: finalRecovery
      }
    });

    agentLog(incidentId, `[Agent] Incident locked in PENDING_APPROVAL. Recommended recovery: ${finalRecovery} (Confidence: ${(finalConfidence * 100).toFixed(0)}%).`, 'success');

  } catch (error: any) {
    agentLog(incidentId, `[Agent] Fatal error during SRE investigation: ${error.message || error}`, 'error');
    
    // Fallback: If Ollama fails, mark the incident as FAILED with the error details
    const failReason = `Agent failed: ${error.message || error}`;
    await prisma.incident.update({
      where: { id: incidentId },
      data: { 
        status: 'FAILED', 
        rootCause: failReason 
      }
    });
    agentLog(incidentId, `[Agent] Incident ${incidentId} marked as FAILED in database.`, 'error');
  } finally {
    if (mcpClient) {
      try {
        await mcpClient.close();
        agentLog(incidentId, `[Agent] MCP server connection closed.`);
      } catch (closeError: any) {
        agentLog(incidentId, `[Agent] Error closing MCP server connection: ${closeError.message || closeError}`, 'error');
      }
    }
  }
}