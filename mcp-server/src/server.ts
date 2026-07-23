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
      const logPath = path.join(sandboxPath, "simulated_logs.txt");
      const logContent = fs.readFileSync(logPath, "utf-8");
      
      return {
        content: [{ type: "text", text: logContent }],
      };
    } 
    
    else if (name === "get_git_diff") {
      // Run the git diff explicitly inside the sandbox folder
      const diffOutput = execSync("git diff HEAD~1 HEAD", {
        cwd: sandboxPath,
        encoding: "utf-8",
      });
      
      return {
        content: [{ type: "text", text: diffOutput || "No changes found." }],
      };
    } 
    
    else if (name === "execute_rollback") {
      const serverJsPath = path.join(sandboxPath, "server.js");
      const serverJsContent = fs.readFileSync(serverJsPath, "utf-8");
      
      // Prevent double rollbacks if already resolved
      if (serverJsContent.includes("const DB_PORT = 5432;")) {
        return {
          content: [{ type: "text", text: "SUCCESS: Service is already restored and running on the stable database port 5432." }],
        };
      }

      // Run Git reset to revert sandbox changes to the previous stable commit
      const output = execSync("git reset --hard HEAD~1", {
        cwd: sandboxPath,
        encoding: "utf-8",
      });
      return {
        content: [{ type: "text", text: `SUCCESS: Service rolled back to previous stable commit. Git output: ${output.trim()}` }],
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
