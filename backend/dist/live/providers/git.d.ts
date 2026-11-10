export declare function localGitCommits(path: string, since: string): Promise<string>;
export declare function localGitCompare(path: string, base: string, head: string): Promise<string>;
export declare class GitHubReadOnlyClient {
    private readonly owner;
    private readonly repo;
    private readonly token?;
    constructor(owner: string, repo: string, token?: string | undefined);
    private get;
    listCommits(since: string, branch: string): Promise<string>;
    getCommit(sha: string): Promise<string>;
    compare(base: string, head: string): Promise<string>;
}
//# sourceMappingURL=git.d.ts.map