export class VercelReadOnlyClient {
    options;
    constructor(options) {
        this.options = options;
    }
    async get(path, query = {}) {
        const url = new URL(`https://api.vercel.com${path}`);
        for (const [key, value] of Object.entries({
            ...query,
            teamId: this.options.team,
        }))
            if (value)
                url.searchParams.set(key, value);
        const response = await fetch(url, {
            headers: {
                Authorization: `Bearer ${this.options.token}`,
                Accept: "application/json",
            },
            signal: AbortSignal.timeout(20000),
        });
        if (!response.ok)
            throw new Error(`Vercel read-only request failed: ${response.status}`);
        return await response.text();
    }
    listDeployments(projectId) {
        return this.get("/v6/deployments", { projectId, limit: "10" });
    }
    getDeployment(idOrUrl) {
        return this.get(`/v13/deployments/${encodeURIComponent(idOrUrl)}`);
    }
    getDeploymentBuildLogs(idOrUrl) {
        return this.get(`/v2/deployments/${encodeURIComponent(idOrUrl)}/events`, {
            direction: "backward",
            limit: "200",
        });
    }
    getRuntimeLogs(idOrUrl, since) {
        return this.get(`/v2/deployments/${encodeURIComponent(idOrUrl)}/events`, {
            direction: "backward",
            limit: "200",
            since: String(since),
        });
    }
}
//# sourceMappingURL=vercel.js.map