/** Read-only Vercel REST fallback. It deliberately exposes no write endpoint. */
type Options = {
    token: string;
    team?: string;
};
export declare class VercelReadOnlyClient {
    private readonly options;
    constructor(options: Options);
    private get;
    listDeployments(projectId: string): Promise<string>;
    getDeployment(idOrUrl: string): Promise<string>;
    getDeploymentBuildLogs(idOrUrl: string): Promise<string>;
    getRuntimeLogs(idOrUrl: string, since: number): Promise<string>;
}
export {};
//# sourceMappingURL=vercel.d.ts.map