/** Deny by default: Live Mode can invoke only verified, explicit read tools. */
export class ReadOnlyToolGuard {
  constructor(
    private readonly allowed: ReadonlySet<string>,
    private readonly audit: (message: string) => void = () => undefined,
  ) {}
  assertAllowed(name: string): void {
    if (!this.allowed.has(name)) {
      this.audit(`Denied Live Mode MCP tool: ${name}`);
      throw new Error(
        `Live Mode denied non-read-only or unknown MCP tool: ${name}`,
      );
    }
  }
  listAllowed(available: { name: string }[]): string[] {
    return available
      .map((t) => t.name)
      .filter((name) => this.allowed.has(name));
  }
}
export const RENDER_READ_TOOLS = new Set([
  "list_workspaces",
  "get_selected_workspace",
  "list_services",
  "get_service",
  "list_deploys",
  "get_deploy",
  "list_events",
  "list_logs",
  "list_log_label_values",
  "get_metrics",
]);
export const VERCEL_READ_TOOLS = new Set([
  "list_deployments",
  "get_deployment",
  "get_deployment_build_logs",
  "get_runtime_logs",
  "get_runtime_errors",
]);
export const GIT_READ_TOOLS = new Set([
  "list_commits",
  "get_commit",
  "compare",
]);
