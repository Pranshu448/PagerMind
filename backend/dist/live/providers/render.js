import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { ReadOnlyToolGuard, RENDER_READ_TOOLS } from "../guard.js";
export async function withRenderReadOnly(token, fn) {
    const transport = new StreamableHTTPClientTransport(new URL("https://mcp.render.com/mcp"), { requestInit: { headers: { Authorization: `Bearer ${token}` } } });
    const client = new Client({ name: "pagermind-live-readonly", version: "1.0.0" }, { capabilities: {} });
    await client.connect(transport);
    try {
        const tools = await client.listTools();
        const guard = new ReadOnlyToolGuard(RENDER_READ_TOOLS);
        const available = guard.listAllowed(tools.tools);
        return await fn(async (name, args) => {
            guard.assertAllowed(name);
            const result = await client.callTool({ name, arguments: args });
            return result.content
                .map((c) => (c.type === "text" ? c.text : ""))
                .join("\n");
        }, available);
    }
    finally {
        await client.close();
    }
}
//# sourceMappingURL=render.js.map