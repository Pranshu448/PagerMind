import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { ReadOnlyToolGuard, RENDER_READ_TOOLS } from '../guard.js';

export async function withRenderReadOnly<T>(token: string, fn: (call: (name: string, args: Record<string, unknown>) => Promise<string>, available: string[]) => Promise<T>): Promise<T> {
  const transport = new StreamableHTTPClientTransport(new URL('https://mcp.render.com/mcp'), { requestInit: { headers: { Authorization: `Bearer ${token}` } } });
  const client = new Client({ name: 'pagermind-live-readonly', version: '1.0.0' }, { capabilities: {} });
  await client.connect(transport as any);
  try { const tools = await client.listTools(); const guard = new ReadOnlyToolGuard(RENDER_READ_TOOLS); const available = guard.listAllowed(tools.tools); return await fn(async (name, args) => { guard.assertAllowed(name); const result: any = await client.callTool({ name, arguments: args }); return (result.content as any[]).map((c: any) => c.type === 'text' ? c.text : '').join('\n'); }, available); } finally { await client.close(); }
}
