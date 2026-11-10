# PagerMind Live Mode (Phase 1)

Live Mode is a local, read-only diagnosis feature. It never deploys, restarts, edits configuration, writes Git, or invokes a non-allowlisted MCP tool.

## Start

```bash
export FRONTEND_ORIGIN=http://localhost:5173
export LIVE_API_TOKEN='choose-a-local-token'
export LIVE_SECRET_KEY="$(openssl rand -base64 32)"
cd backend && npm run dev
cd ../frontend && npm run dev
```

Open the frontend, select **Live Mode**, enter `LIVE_API_TOKEN`, then connect a service. Secrets are AES-256-GCM encrypted before SQLite persistence and are never returned to the browser.

## Required access

Use least-privileged platform and GitHub tokens. Render connects to its hosted MCP with a Bearer token and calls only its verified read allowlist. Vercel uses the local read-only REST fallback because the hosted MCP requires OAuth. GitHub uses only read endpoints; a local Git path runs fixed-argument `git` commands.

## Safety and limitations

Platform/log/Git content is treated as untrusted and redacted before persistence or LLM input. Missing sources become evidence gaps. Confidence is a deterministic heuristic, not a calibrated probability. Never put platform credentials in shell history or committed files.
