/** Read-only Vercel REST fallback. It deliberately exposes no write endpoint. */
type Options = { token: string; team?: string };
export class VercelReadOnlyClient {
  constructor(private readonly options: Options) {}
  private async get(path: string, query: Record<string, string | undefined> = {}): Promise<string> { const url = new URL(`https://api.vercel.com${path}`); for (const [key, value] of Object.entries({ ...query, teamId: this.options.team })) if (value) url.searchParams.set(key, value); const response = await fetch(url, { headers: { Authorization: `Bearer ${this.options.token}`, Accept: 'application/json' }, signal: AbortSignal.timeout(20000) }); if (!response.ok) throw new Error(`Vercel read-only request failed: ${response.status}`); return await response.text(); }
  listDeployments(projectId: string): Promise<string> { return this.get('/v6/deployments', { projectId, limit: '10' }); }
  getDeployment(idOrUrl: string): Promise<string> { return this.get(`/v13/deployments/${encodeURIComponent(idOrUrl)}`); }
  getDeploymentBuildLogs(idOrUrl: string): Promise<string> { return this.get(`/v2/deployments/${encodeURIComponent(idOrUrl)}/events`, { direction: 'backward', limit: '200' }); }
  getRuntimeLogs(idOrUrl: string, since: number): Promise<string> { return this.get(`/v2/deployments/${encodeURIComponent(idOrUrl)}/events`, { direction: 'backward', limit: '200', since: String(since) }); }
}
