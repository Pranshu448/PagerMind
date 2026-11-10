import { execFile } from "node:child_process";
import { promisify } from "node:util";
const exec = promisify(execFile);
export async function localGitCommits(path, since) {
    const { stdout } = await exec("git", [
        "-C",
        path,
        "log",
        `--since=${since}`,
        "--format=%H%x09%aI%x09%s",
        "--max-count=30",
    ], { timeout: 15000, maxBuffer: 1024 * 1024 });
    return stdout;
}
export async function localGitCompare(path, base, head) {
    const { stdout } = await exec("git", [
        "-C",
        path,
        "diff",
        "--no-ext-diff",
        "--unified=3",
        "--",
        `${base}..${head}`,
    ], { timeout: 15000, maxBuffer: 1024 * 1024 });
    return stdout.slice(0, 20000);
}
export class GitHubReadOnlyClient {
    owner;
    repo;
    token;
    constructor(owner, repo, token) {
        this.owner = owner;
        this.repo = repo;
        this.token = token;
    }
    async get(path) {
        const response = await fetch(`https://api.github.com${path}`, {
            headers: {
                Accept: "application/vnd.github+json",
                ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
            },
            signal: AbortSignal.timeout(20000),
        });
        if (!response.ok)
            throw new Error(`GitHub read-only request failed: ${response.status}`);
        return response.text();
    }
    listCommits(since, branch) {
        return this.get(`/repos/${encodeURIComponent(this.owner)}/${encodeURIComponent(this.repo)}/commits?sha=${encodeURIComponent(branch)}&since=${encodeURIComponent(since)}&per_page=30`);
    }
    getCommit(sha) {
        return this.get(`/repos/${encodeURIComponent(this.owner)}/${encodeURIComponent(this.repo)}/commits/${encodeURIComponent(sha)}`);
    }
    compare(base, head) {
        return this.get(`/repos/${encodeURIComponent(this.owner)}/${encodeURIComponent(this.repo)}/compare/${encodeURIComponent(base)}...${encodeURIComponent(head)}`);
    }
}
//# sourceMappingURL=git.js.map