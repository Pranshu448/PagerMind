import { z } from 'zod';
export declare const liveProviderSchema: z.ZodEnum<{
    render: "render";
    vercel: "vercel";
}>;
export declare const llmSchema: z.ZodObject<{
    provider: z.ZodEnum<{
        gemini: "gemini";
        ollama: "ollama";
    }>;
    baseUrl: z.ZodOptional<z.ZodString>;
    model: z.ZodString;
    numCtx: z.ZodDefault<z.ZodNumber>;
}, z.core.$strip>;
export declare const serviceConfigSchema: z.ZodObject<{
    name: z.ZodString;
    provider: z.ZodEnum<{
        render: "render";
        vercel: "vercel";
    }>;
    healthUrl: z.ZodString;
    readyUrl: z.ZodOptional<z.ZodString>;
    probeTimeoutMs: z.ZodDefault<z.ZodNumber>;
    checkIntervalMs: z.ZodDefault<z.ZodNumber>;
    failureThreshold: z.ZodDefault<z.ZodNumber>;
    recoveryThreshold: z.ZodDefault<z.ZodNumber>;
    logLookbackMinutes: z.ZodDefault<z.ZodNumber>;
    providerServiceId: z.ZodString;
    workspace: z.ZodOptional<z.ZodString>;
    team: z.ZodOptional<z.ZodString>;
    project: z.ZodOptional<z.ZodString>;
    git: z.ZodOptional<z.ZodObject<{
        owner: z.ZodOptional<z.ZodString>;
        repo: z.ZodOptional<z.ZodString>;
        branch: z.ZodDefault<z.ZodString>;
        localPath: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    llm: z.ZodObject<{
        provider: z.ZodEnum<{
            gemini: "gemini";
            ollama: "ollama";
        }>;
        baseUrl: z.ZodOptional<z.ZodString>;
        model: z.ZodString;
        numCtx: z.ZodDefault<z.ZodNumber>;
    }, z.core.$strip>;
}, z.core.$strip>;
export type ServiceConfig = z.infer<typeof serviceConfigSchema>;
export declare const secretsSchema: z.ZodObject<{
    providerToken: z.ZodString;
    gitToken: z.ZodOptional<z.ZodString>;
    geminiApiKey: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type LiveSecrets = z.infer<typeof secretsSchema>;
export type EvidenceGap = {
    source: string;
    reason: string;
};
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
    errorClass?: 'timeout' | 'dns' | 'tls' | 'refused' | 'http';
    redirectCount: number;
    observedAt: string;
};
export declare const hypothesisSchema: z.ZodObject<{
    claim: z.ZodString;
    supportingEvidence: z.ZodArray<z.ZodString>;
    contradictingEvidence: z.ZodArray<z.ZodString>;
    missingEvidence: z.ZodArray<z.ZodString>;
    quotedSnippets: z.ZodArray<z.ZodObject<{
        evidenceId: z.ZodString;
        snippet: z.ZodString;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const llmOutputSchema: z.ZodObject<{
    hypotheses: z.ZodArray<z.ZodObject<{
        claim: z.ZodString;
        supportingEvidence: z.ZodArray<z.ZodString>;
        contradictingEvidence: z.ZodArray<z.ZodString>;
        missingEvidence: z.ZodArray<z.ZodString>;
        quotedSnippets: z.ZodArray<z.ZodObject<{
            evidenceId: z.ZodString;
            snippet: z.ZodString;
        }, z.core.$strip>>;
    }, z.core.$strip>>;
    nextSteps: z.ZodArray<z.ZodString>;
}, z.core.$strip>;
export type Hypothesis = z.infer<typeof hypothesisSchema>;
//# sourceMappingURL=types.d.ts.map