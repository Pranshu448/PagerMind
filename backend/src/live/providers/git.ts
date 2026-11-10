import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const exec = promisify(execFile);
export async function localGitCommits(path: string, since: string): Promise<string> { const { stdout } = await exec('git', ['-C', path, 'log', `--since=${since}`, '--format=%H%x09%aI%x09%s', '--max-count=30'], { timeout: 15000, maxBuffer: 1024 * 1024 }); return stdout; }
export async function localGitCompare(path: string, base: string, head: string): Promise<string> { const { stdout } = await exec('git', ['-C', path, 'diff', '--no-ext-diff', '--unified=3', '--', `${base}..${head}`], { timeout: 15000, maxBuffer: 1024 * 1024 }); return stdout.slice(0, 20000); }
export class GitHubReadOnlyClient {
  constructor(private readonly owner: string, private readonly repo: string, private readonly token?: string) {}
  private async get(path: string): Promise<string> { const response = await fetch(`https://api.github.com${path}`, { headers: { Accept: 'application/vnd.github+json', ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}) }, signal: AbortSignal.timeout(20000) }); if (!response.ok) throw new Error(`GitHub read-only request failed: ${response.status}`); return response.text(); }
  listCommits(since: string, branch: string): Promise<string> { return this.get(`/repos/${encodeURIComponent(this.owner)}/${encodeURIComponent(this.repo)}/commits?sha=${encodeURIComponent(branch)}&since=${encodeURIComponent(since)}&per_page=30`); }
  getCommit(sha: string): Promise<string> { return this.get(`/repos/${encodeURIComponent(this.owner)}/${encodeURIComponent(this.repo)}/commits/${encodeURIComponent(sha)}`); }
  compare(base: string, head: string): Promise<string> { return this.get(`/repos/${encodeURIComponent(this.owner)}/${encodeURIComponent(this.repo)}/compare/${encodeURIComponent(base)}...${encodeURIComponent(head)}`); }
}
