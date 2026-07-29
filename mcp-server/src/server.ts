import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import * as fs from "fs";
import { execSync } from "child_process";
import * as path from "path";

// 1. Initialize the MCP Server
const server = new Server(
  {
    name: "pagermind-mcp-sandbox",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// 2. Define the Tool Menu (What the AI is allowed to do)
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "read_simulated_logs",
        description: "Reads the last 20 lines of the production server log file to identify crashes or errors.",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "get_git_diff",
        description: "Retrieves the exact code changes from the most recent deployment commit.",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "get_recent_commit",
        description: "Retrieves metadata (hash, author, time, and subject message) of the most recent git commit in the sandbox repository.",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "store_fact",
        description: "Stores a key-value fact in persistent memory to retain SRE investigation state.",
        inputSchema: {
          type: "object",
          properties: {
            key: { type: "string", description: "The unique key to identify the fact (e.g. 'git_checked')." },
            value: { type: "string", description: "The fact content to store." }
          },
          required: ["key", "value"]
        }
      },
      {
        name: "retrieve_memory",
        description: "Retrieves stored facts from SRE incident memory.",
        inputSchema: {
          type: "object",
          properties: {
            key: { type: "string", description: "Optional specific key to retrieve. If omitted, returns all memory." }
          }
        }
      },
      {
        name: "clear_memory",
        description: "Wipes out all stored SRE incident memory.",
        inputSchema: { type: "object", properties: {} }
      },
      {
        name: "get_cpu",
        description: "Retrieves simulated CPU utilization metrics of the production server.",
        inputSchema: { type: "object", properties: {} }
      },
      {
        name: "get_memory",
        description: "Retrieves simulated Memory utilization metrics of the production server.",
        inputSchema: { type: "object", properties: {} }
      },
      {
        name: "get_latency",
        description: "Retrieves simulated request latency metrics of the production server.",
        inputSchema: { type: "object", properties: {} }
      },
      {
        name: "get_error_rate",
        description: "Retrieves simulated HTTP request error rate metrics of the production server.",
        inputSchema: { type: "object", properties: {} }
      },
      {
        name: "restart_pod",
        description: "Restarts a specific Kubernetes pod by destroying and recreating the container.",
        inputSchema: {
          type: "object",
          properties: {
            pod_name: { type: "string", description: "The name of the target pod to restart (e.g. 'checkout-api-pod-xyz')." }
          },
          required: ["pod_name"]
        }
      },
      {
        name: "rollback_deployment",
        description: "Undoes the last deployment rollout, reverting to the previous stable container image revision.",
        inputSchema: {
          type: "object",
          properties: {
            deployment_name: { type: "string", description: "The name of the target deployment to roll back." }
          },
          required: ["deployment_name"]
        }
      },
      {
        name: "scale_deployment",
        description: "Scales the number of replicas for a specific Kubernetes deployment.",
        inputSchema: {
          type: "object",
          properties: {
            deployment_name: { type: "string", description: "The name of the target deployment to scale." },
            replicas: { type: "number", description: "The target replica count (e.g., 3, 5)." }
          },
          required: ["deployment_name", "replicas"]
        }
      },
      {
        name: "execute_rollback",
        description: "Reverts the server to the previous stable state. MUST require human approval first.",
        inputSchema: { type: "object", properties: {} },
      },
    ],
  };
});

// 3. Execute the Tools (The actual Node.js logic)
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name } = request.params;
  
  // Resolve the path to the sandbox folder safely
  const sandboxPath = path.join(process.cwd(), "../sandbox");

  try {
    if (name === "read_simulated_logs") {
      try {
        const logs = execSync("docker compose -f /Users/pranshu/Documents/PagerMind/sandbox/docker-compose.yml logs api --tail=100 --no-color", {
          encoding: "utf-8"
        });
        return {
          content: [{ type: "text", text: logs || "No container logs available." }],
        };
      } catch (err: any) {
        return {
          content: [{ type: "text", text: `Error reading docker logs: ${err.message}` }],
        };
      }
    } 
    
    else if (name === "get_git_diff") {
      try {
        // Run the git diff explicitly inside the sandbox folder
        const diffOutput = execSync("git diff HEAD~1 HEAD", {
          cwd: sandboxPath,
          encoding: "utf-8",
        });
        
        return {
          content: [{ type: "text", text: diffOutput || "No committed changes found in the latest deployment." }],
        };
      } catch (error: any) {
        // Fallback: If no parent commit exists (single commit repo), show unstaged diff
        const unstagedDiff = execSync("git diff", {
          cwd: sandboxPath,
          encoding: "utf-8",
        });
        return {
          content: [{ type: "text", text: `Notice: Only one commit exists in the repository history.\nUncommitted changes on disk:\n${unstagedDiff || "None (working tree clean)"}` }],
        };
      }
    } 
    
    else if (name === "get_recent_commit") {
      try {
        const logOutput = execSync('git log -1 --format="%h%n%an%n%ad%n%B" --date=format:"%H:%M"', {
          cwd: sandboxPath,
          encoding: "utf-8",
        });
        const lines = logOutput.trim().split("\n");
        const hash = lines[0] || "N/A";
        const author = lines[1] || "N/A";
        const time = lines[2] || "N/A";
        const message = lines.slice(3).join("\n") || "N/A";

        const commitInfo = {
          hash,
          author,
          time,
          message: message.trim()
        };

        return {
          content: [{ type: "text", text: JSON.stringify(commitInfo, null, 2) }],
        };
      } catch (error: any) {
        return {
          content: [{ type: "text", text: JSON.stringify({ hash: "N/A", author: "N/A", time: "N/A", message: "No git commits found in sandbox repo." }, null, 2) }],
        };
      }
    } 
    
    else if (name === "store_fact") {
      const { key, value } = request.params.arguments as { key: string; value: string };
      const memoryPath = path.join(sandboxPath, "incident_memory.json");
      
      let memory: Record<string, string> = {};
      try {
        if (fs.existsSync(memoryPath)) {
          memory = JSON.parse(fs.readFileSync(memoryPath, "utf-8"));
        }
      } catch (e) {
        // start with fresh object if file doesn't exist or is invalid JSON
      }
      
      memory[key] = value;
      fs.writeFileSync(memoryPath, JSON.stringify(memory, null, 2), "utf-8");
      return {
        content: [{ type: "text", text: `SUCCESS: Fact stored for key '${key}'.` }],
      };
    } 
    
    else if (name === "retrieve_memory") {
      const { key } = (request.params.arguments || {}) as { key?: string };
      const memoryPath = path.join(sandboxPath, "incident_memory.json");
      
      let memory: Record<string, string> = {};
      try {
        if (fs.existsSync(memoryPath)) {
          memory = JSON.parse(fs.readFileSync(memoryPath, "utf-8"));
        }
      } catch (e) {
        // return empty object if read fails
      }
      
      if (key) {
        return {
          content: [{ type: "text", text: memory[key] || `Fact not found for key '${key}'.` }],
        };
      } else {
        return {
          content: [{ type: "text", text: JSON.stringify(memory, null, 2) }],
        };
      }
    } 
    
    else if (name === "clear_memory") {
      const memoryPath = path.join(sandboxPath, "incident_memory.json");
      fs.writeFileSync(memoryPath, JSON.stringify({}, null, 2), "utf-8");
      return {
        content: [{ type: "text", text: "SUCCESS: SRE incident memory cleared." }],
      };
    }
    
    else if (name === "get_cpu") {
      try {
        const output = execSync("docker stats --no-stream --format '{{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}'", { encoding: "utf-8" });
        const lines = output.trim().split("\n");
        const apiLine = lines.find(l => l.includes("api"));
        if (apiLine) {
          const parts = apiLine.split("\t");
          const cpu = parts[1] || "0%";
          return {
            content: [{ type: "text", text: JSON.stringify({ cpu_utilization: cpu, status: parseFloat(cpu) > 80 ? "High" : "Normal" }, null, 2) }],
          };
        }
      } catch (err: any) {
        // fallback
      }
      return {
        content: [{ type: "text", text: JSON.stringify({ cpu_utilization: "N/A", status: "Unknown (Container Down)" }, null, 2) }],
      };
    } 
    
    else if (name === "get_memory") {
      try {
        const output = execSync("docker stats --no-stream --format '{{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}'", { encoding: "utf-8" });
        const lines = output.trim().split("\n");
        const apiLine = lines.find(l => l.includes("api"));
        if (apiLine) {
          const parts = apiLine.split("\t");
          const mem = parts[2] || "0MiB";
          return {
            content: [{ type: "text", text: JSON.stringify({ memory_utilization: mem, status: "Normal" }, null, 2) }],
          };
        }
      } catch (err: any) {
        // fallback
      }
      return {
        content: [{ type: "text", text: JSON.stringify({ memory_utilization: "N/A", status: "Unknown (Container Down)" }, null, 2) }],
      };
    } 
    
    else if (name === "get_latency") {
      try {
        const response = await fetch("http://localhost:8080/metrics");
        if (response.ok) {
          const data = (await response.json()) as any;
          return {
            content: [{ type: "text", text: JSON.stringify({ latency_ms: parseFloat(data.avg_latency_ms), status: "Normal" }, null, 2) }],
          };
        }
      } catch (err: any) {
        // failed to connect
      }
      return {
        content: [{ type: "text", text: JSON.stringify({ latency_ms: 5000, status: "Critical (Timeout)" }, null, 2) }],
      };
    } 
    
    else if (name === "get_error_rate") {
      try {
        const response = await fetch("http://localhost:8080/metrics");
        if (response.ok) {
          const data = (await response.json()) as any;
          return {
            content: [{ type: "text", text: JSON.stringify({ error_rate: data.error_rate, status: parseFloat(data.error_rate) > 5 ? "Elevated" : "Normal" }, null, 2) }],
          };
        }
      } catch (err: any) {
        // failed to connect
      }
      return {
        content: [{ type: "text", text: JSON.stringify({ error_rate: "100.0%", status: "Critical" }, null, 2) }],
      };
    }
    
    else if (name === "restart_pod") {
      try {
        // Ensure dependent database/redis services are started before restarting the API
        execSync("docker compose -f /Users/pranshu/Documents/PagerMind/sandbox/docker-compose.yml start postgres redis 2>/dev/null || true");
        execSync("docker compose -f /Users/pranshu/Documents/PagerMind/sandbox/docker-compose.yml restart api");
        return {
          content: [{ type: "text", text: "SUCCESS: Ensured database/cache are running and restarted docker container 'api'." }],
        };
      } catch (err: any) {
        return {
          content: [{ type: "text", text: `Error restarting container: ${err.message}` }],
        };
      }
    }
    
    else if (name === "rollback_deployment" || name === "execute_rollback") {
      try {
        // Clear latency flag if any
        fs.unlinkSync(path.join(sandboxPath, "api/latency.flag"));
      } catch (e) {
        // ignore
      }

      // Restore .env backup if exists
      const envPath = path.join(sandboxPath, "api/.env");
      if (fs.existsSync(envPath + ".bak")) {
        try {
          fs.copyFileSync(envPath + ".bak", envPath);
          fs.unlinkSync(envPath + ".bak");
        } catch (e) {
          // ignore
        }
      }

      let gitOutput = "";
      try {
        // Prevent rolling back before the containerized sandbox environment was established.
        // We check if HEAD~1 has the docker-compose.yml file.
        execSync("git show HEAD~1:docker-compose.yml", {
          cwd: sandboxPath,
          stdio: ["ignore", "ignore", "ignore"],
        });

        gitOutput = execSync("git reset --hard HEAD~1", {
          cwd: sandboxPath,
          encoding: "utf-8",
        });
      } catch (error: any) {
        // Fallback: Discard unstaged changes only and preserve stable base commit
        gitOutput = execSync("git reset --hard HEAD", {
          cwd: sandboxPath,
          encoding: "utf-8",
        });
        gitOutput += " (Note: Discarded config changes and preserved infrastructure base commit)";
      }

      // Ensure dependent services are started and restart api container to apply code rollback
      try {
        execSync("docker compose -f /Users/pranshu/Documents/PagerMind/sandbox/docker-compose.yml start postgres redis 2>/dev/null || true");
        execSync("docker compose -f /Users/pranshu/Documents/PagerMind/sandbox/docker-compose.yml restart api");
      } catch (err: any) {
        gitOutput += ` (Warning: Failed to restart container: ${err.message})`;
      }

      return {
        content: [{ type: "text", text: `SUCCESS: Rollback complete. Git reset status: ${gitOutput.trim()}` }],
      };
    }
    
    else if (name === "scale_deployment") {
      const { deployment_name, replicas } = request.params.arguments as { deployment_name: string; replicas: number };
      const timestamp = new Date().toISOString();
      const output = `SUCCESS: Kubernetes Deployment '${deployment_name}' scaled successfully to ${replicas} replicas.
deployment.apps/${deployment_name} scaled
Active Pod replicas: ${replicas}/${replicas} running.
Timestamp: ${timestamp}`;
      return {
        content: [{ type: "text", text: output }],
      };
    } 
    
    else {
      throw new Error(`Tool not found: ${name}`);
    }
  } catch (error: any) {
    // If something fails, tell the AI so it can figure out why
    return {
      content: [{ type: "text", text: `Error executing tool: ${error.message}` }],
      isError: true,
    };
  }
});

// 4. Start the Server over Standard Input/Output
async function run() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("PagerMind MCP Server running on stdio"); 
}

run().catch(console.error);
