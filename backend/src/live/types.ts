import { z } from "zod";

export const liveProviderSchema = z.enum(["render", "vercel"]);
export const llmSchema = z.object({
  provider: z.enum(["ollama", "gemini"]),
  baseUrl: z.string().url().optional(),
  model: z.string().min(1),
  numCtx: z.number().int().min(512).max(131072).default(8192),
});
export const serviceConfigSchema = z.object({
  name: z.string().min(1).max(120),
  provider: liveProviderSchema,
  healthUrl: z.string().url(),
  readyUrl: z.string().url().optional(),
  probeTimeoutMs: z.number().int().min(1000).max(60000).default(10000),
  checkIntervalMs: z.number().int().min(5000).max(3600000).default(30000),
  failureThreshold: z.number().int().min(1).max(20).default(3),
  recoveryThreshold: z.number().int().min(1).max(20).default(3),
  logLookbackMinutes: z.number().int().min(1).max(1440).default(30),
  providerServiceId: z.string().min(1),
  workspace: z.string().optional(),
  team: z.string().optional(),
  project: z.string().optional(),
  git: z
    .object({
      owner: z.string().optional(),
      repo: z.string().optional(),
      branch: z.string().default("main"),
      localPath: z.string().optional(),
    })
    .optional(),
  llm: llmSchema,
});
export type ServiceConfig = z.infer<typeof serviceConfigSchema>;
export const secretsSchema = z.object({
  providerToken: z.string().min(1),
  gitToken: z.string().optional(),
  geminiApiKey: z.string().optional(),
});
export type LiveSecrets = z.infer<typeof secretsSchema>;
export type EvidenceGap = { source: string; reason: string };
export type EvidenceItem = {
  evidenceId?: string;
  source: string;
  observedAt: string;
  content: string;
  truncated: boolean;
};
export type ProbeResult = {
  ok: boolean;
  status?: number;
  latencyMs: number;
  errorClass?: "timeout" | "dns" | "tls" | "refused" | "http";
  redirectCount: number;
  observedAt: string;
};
export const hypothesisSchema = z.object({
  claim: z.string().min(1).max(1600),
  supportingEvidence: z.array(z.string()).max(12),
  contradictingEvidence: z.array(z.string()).max(12),
  missingEvidence: z.array(z.string()).max(12),
  quotedSnippets: z
    .array(z.object({ evidenceId: z.string(), snippet: z.string().max(500) }))
    .max(12),
});
export const llmOutputSchema = z.object({
  hypotheses: z.array(hypothesisSchema).max(3),
  nextSteps: z.array(z.string()).max(8),
});
export type Hypothesis = z.infer<typeof hypothesisSchema>;
