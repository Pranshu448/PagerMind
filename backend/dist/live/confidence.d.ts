import type { EvidenceGap, EvidenceItem, Hypothesis } from "./types.js";
export declare const WEIGHTS: {
    readonly independentSources: 15;
    readonly temporalAlignment: 20;
    readonly specificError: 15;
    readonly verifiedQuote: 20;
    readonly contradiction: 15;
    readonly winnerMargin: 15;
    readonly unavailableSourceCap: 65;
};
export declare function scoreConfidence(hypotheses: Hypothesis[], evidence: EvidenceItem[], gaps: EvidenceGap[]): {
    score: number;
    cap: number;
    breakdown: {
        independentSources: number;
        verifiedQuotedSnippets: number;
        contradictions: number;
        gaps: string[];
        heuristic: boolean;
    };
};
//# sourceMappingURL=confidence.d.ts.map