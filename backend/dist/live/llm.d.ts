import { type ServiceConfig } from "./types.js";
export declare function analyze(config: ServiceConfig, geminiKey: string | undefined, evidenceText: string): Promise<unknown>;
export declare function validateLlmOutput(value: unknown): {
    hypotheses: {
        claim: string;
        supportingEvidence: string[];
        contradictingEvidence: string[];
        missingEvidence: string[];
        quotedSnippets: {
            evidenceId: string;
            snippet: string;
        }[];
    }[];
    nextSteps: string[];
};
//# sourceMappingURL=llm.d.ts.map