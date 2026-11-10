import type { EvidenceItem, EvidenceGap } from '../types.js';
export declare function createLiveGraph(): import("@langchain/langgraph").CompiledStateGraph<{
    config: {
        name: string;
        provider: "render" | "vercel";
        healthUrl: string;
        readyUrl?: string | undefined;
        probeTimeoutMs: number;
        checkIntervalMs: number;
        failureThreshold: number;
        recoveryThreshold: number;
        logLookbackMinutes: number;
        providerServiceId: string;
        workspace?: string | undefined;
        team?: string | undefined;
        project?: string | undefined;
        git?: {
            owner?: string | undefined;
            repo?: string | undefined;
            branch: string;
            localPath?: string | undefined;
        } | undefined;
        llm: {
            provider: "gemini" | "ollama";
            baseUrl?: string | undefined;
            model: string;
            numCtx: number;
        };
    };
    platformToken: string;
    gitToken: string | undefined;
    geminiKey: string | undefined;
    trigger: "manual" | "monitor";
    evidence: EvidenceItem[];
    gaps: EvidenceGap[];
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
    report: any;
}, {
    config?: {
        name: string;
        provider: "render" | "vercel";
        healthUrl: string;
        readyUrl?: string | undefined;
        probeTimeoutMs: number;
        checkIntervalMs: number;
        failureThreshold: number;
        recoveryThreshold: number;
        logLookbackMinutes: number;
        providerServiceId: string;
        workspace?: string | undefined;
        team?: string | undefined;
        project?: string | undefined;
        git?: {
            owner?: string | undefined;
            repo?: string | undefined;
            branch: string;
            localPath?: string | undefined;
        } | undefined;
        llm: {
            provider: "gemini" | "ollama";
            baseUrl?: string | undefined;
            model: string;
            numCtx: number;
        };
    };
    platformToken?: string;
    gitToken?: string | undefined;
    geminiKey?: string | undefined;
    trigger?: "manual" | "monitor";
    evidence?: EvidenceItem[] | import("@langchain/langgraph").OverwriteValue<EvidenceItem[]>;
    gaps?: EvidenceGap[] | import("@langchain/langgraph").OverwriteValue<EvidenceGap[]>;
    hypotheses?: {
        claim: string;
        supportingEvidence: string[];
        contradictingEvidence: string[];
        missingEvidence: string[];
        quotedSnippets: {
            evidenceId: string;
            snippet: string;
        }[];
    }[] | import("@langchain/langgraph").OverwriteValue<{
        claim: string;
        supportingEvidence: string[];
        contradictingEvidence: string[];
        missingEvidence: string[];
        quotedSnippets: {
            evidenceId: string;
            snippet: string;
        }[];
    }[]>;
    report?: any;
}, "__start__" | "gather_platform" | "git_changes" | "hypothesize" | "normalize_evidence" | "probe_service" | "skeptic" | "validate_sources" | "write_report", {
    config: {
        (annotation: import("@langchain/langgraph").SingleReducer<{
            name: string;
            provider: "render" | "vercel";
            healthUrl: string;
            readyUrl?: string | undefined;
            probeTimeoutMs: number;
            checkIntervalMs: number;
            failureThreshold: number;
            recoveryThreshold: number;
            logLookbackMinutes: number;
            providerServiceId: string;
            workspace?: string | undefined;
            team?: string | undefined;
            project?: string | undefined;
            git?: {
                owner?: string | undefined;
                repo?: string | undefined;
                branch: string;
                localPath?: string | undefined;
            } | undefined;
            llm: {
                provider: "gemini" | "ollama";
                baseUrl?: string | undefined;
                model: string;
                numCtx: number;
            };
        }, {
            name: string;
            provider: "render" | "vercel";
            healthUrl: string;
            readyUrl?: string | undefined;
            probeTimeoutMs: number;
            checkIntervalMs: number;
            failureThreshold: number;
            recoveryThreshold: number;
            logLookbackMinutes: number;
            providerServiceId: string;
            workspace?: string | undefined;
            team?: string | undefined;
            project?: string | undefined;
            git?: {
                owner?: string | undefined;
                repo?: string | undefined;
                branch: string;
                localPath?: string | undefined;
            } | undefined;
            llm: {
                provider: "gemini" | "ollama";
                baseUrl?: string | undefined;
                model: string;
                numCtx: number;
            };
        }>): import("@langchain/langgraph").BaseChannel<{
            name: string;
            provider: "render" | "vercel";
            healthUrl: string;
            readyUrl?: string | undefined;
            probeTimeoutMs: number;
            checkIntervalMs: number;
            failureThreshold: number;
            recoveryThreshold: number;
            logLookbackMinutes: number;
            providerServiceId: string;
            workspace?: string | undefined;
            team?: string | undefined;
            project?: string | undefined;
            git?: {
                owner?: string | undefined;
                repo?: string | undefined;
                branch: string;
                localPath?: string | undefined;
            } | undefined;
            llm: {
                provider: "gemini" | "ollama";
                baseUrl?: string | undefined;
                model: string;
                numCtx: number;
            };
        }, import("@langchain/langgraph").OverwriteValue<{
            name: string;
            provider: "render" | "vercel";
            healthUrl: string;
            readyUrl?: string | undefined;
            probeTimeoutMs: number;
            checkIntervalMs: number;
            failureThreshold: number;
            recoveryThreshold: number;
            logLookbackMinutes: number;
            providerServiceId: string;
            workspace?: string | undefined;
            team?: string | undefined;
            project?: string | undefined;
            git?: {
                owner?: string | undefined;
                repo?: string | undefined;
                branch: string;
                localPath?: string | undefined;
            } | undefined;
            llm: {
                provider: "gemini" | "ollama";
                baseUrl?: string | undefined;
                model: string;
                numCtx: number;
            };
        }> | {
            name: string;
            provider: "render" | "vercel";
            healthUrl: string;
            readyUrl?: string | undefined;
            probeTimeoutMs: number;
            checkIntervalMs: number;
            failureThreshold: number;
            recoveryThreshold: number;
            logLookbackMinutes: number;
            providerServiceId: string;
            workspace?: string | undefined;
            team?: string | undefined;
            project?: string | undefined;
            git?: {
                owner?: string | undefined;
                repo?: string | undefined;
                branch: string;
                localPath?: string | undefined;
            } | undefined;
            llm: {
                provider: "gemini" | "ollama";
                baseUrl?: string | undefined;
                model: string;
                numCtx: number;
            };
        }, unknown>;
        (): import("@langchain/langgraph").LastValue<{
            name: string;
            provider: "render" | "vercel";
            healthUrl: string;
            readyUrl?: string | undefined;
            probeTimeoutMs: number;
            checkIntervalMs: number;
            failureThreshold: number;
            recoveryThreshold: number;
            logLookbackMinutes: number;
            providerServiceId: string;
            workspace?: string | undefined;
            team?: string | undefined;
            project?: string | undefined;
            git?: {
                owner?: string | undefined;
                repo?: string | undefined;
                branch: string;
                localPath?: string | undefined;
            } | undefined;
            llm: {
                provider: "gemini" | "ollama";
                baseUrl?: string | undefined;
                model: string;
                numCtx: number;
            };
        }>;
        Root: <S extends import("@langchain/langgraph").StateDefinition>(sd: S) => import("@langchain/langgraph").AnnotationRoot<S>;
    };
    platformToken: {
        (annotation: import("@langchain/langgraph").SingleReducer<string, string>): import("@langchain/langgraph").BaseChannel<string, string | import("@langchain/langgraph").OverwriteValue<string>, unknown>;
        (): import("@langchain/langgraph").LastValue<string>;
        Root: <S extends import("@langchain/langgraph").StateDefinition>(sd: S) => import("@langchain/langgraph").AnnotationRoot<S>;
    };
    gitToken: {
        (annotation: import("@langchain/langgraph").SingleReducer<string | undefined, string | undefined>): import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
        (): import("@langchain/langgraph").LastValue<string | undefined>;
        Root: <S extends import("@langchain/langgraph").StateDefinition>(sd: S) => import("@langchain/langgraph").AnnotationRoot<S>;
    };
    geminiKey: {
        (annotation: import("@langchain/langgraph").SingleReducer<string | undefined, string | undefined>): import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
        (): import("@langchain/langgraph").LastValue<string | undefined>;
        Root: <S extends import("@langchain/langgraph").StateDefinition>(sd: S) => import("@langchain/langgraph").AnnotationRoot<S>;
    };
    trigger: {
        (annotation: import("@langchain/langgraph").SingleReducer<"manual" | "monitor", "manual" | "monitor">): import("@langchain/langgraph").BaseChannel<"manual" | "monitor", "manual" | "monitor" | import("@langchain/langgraph").OverwriteValue<"manual" | "monitor">, unknown>;
        (): import("@langchain/langgraph").LastValue<"manual" | "monitor">;
        Root: <S extends import("@langchain/langgraph").StateDefinition>(sd: S) => import("@langchain/langgraph").AnnotationRoot<S>;
    };
    evidence: import("@langchain/langgraph").BaseChannel<EvidenceItem[], EvidenceItem[] | import("@langchain/langgraph").OverwriteValue<EvidenceItem[]>, unknown>;
    gaps: import("@langchain/langgraph").BaseChannel<EvidenceGap[], EvidenceGap[] | import("@langchain/langgraph").OverwriteValue<EvidenceGap[]>, unknown>;
    hypotheses: import("@langchain/langgraph").BaseChannel<{
        claim: string;
        supportingEvidence: string[];
        contradictingEvidence: string[];
        missingEvidence: string[];
        quotedSnippets: {
            evidenceId: string;
            snippet: string;
        }[];
    }[], {
        claim: string;
        supportingEvidence: string[];
        contradictingEvidence: string[];
        missingEvidence: string[];
        quotedSnippets: {
            evidenceId: string;
            snippet: string;
        }[];
    }[] | import("@langchain/langgraph").OverwriteValue<{
        claim: string;
        supportingEvidence: string[];
        contradictingEvidence: string[];
        missingEvidence: string[];
        quotedSnippets: {
            evidenceId: string;
            snippet: string;
        }[];
    }[]>, unknown>;
    report: {
        (annotation: import("@langchain/langgraph").SingleReducer<any, any>): import("@langchain/langgraph").BaseChannel<any, any, unknown>;
        (): import("@langchain/langgraph").LastValue<any>;
        Root: <S extends import("@langchain/langgraph").StateDefinition>(sd: S) => import("@langchain/langgraph").AnnotationRoot<S>;
    };
}, {
    config: {
        (annotation: import("@langchain/langgraph").SingleReducer<{
            name: string;
            provider: "render" | "vercel";
            healthUrl: string;
            readyUrl?: string | undefined;
            probeTimeoutMs: number;
            checkIntervalMs: number;
            failureThreshold: number;
            recoveryThreshold: number;
            logLookbackMinutes: number;
            providerServiceId: string;
            workspace?: string | undefined;
            team?: string | undefined;
            project?: string | undefined;
            git?: {
                owner?: string | undefined;
                repo?: string | undefined;
                branch: string;
                localPath?: string | undefined;
            } | undefined;
            llm: {
                provider: "gemini" | "ollama";
                baseUrl?: string | undefined;
                model: string;
                numCtx: number;
            };
        }, {
            name: string;
            provider: "render" | "vercel";
            healthUrl: string;
            readyUrl?: string | undefined;
            probeTimeoutMs: number;
            checkIntervalMs: number;
            failureThreshold: number;
            recoveryThreshold: number;
            logLookbackMinutes: number;
            providerServiceId: string;
            workspace?: string | undefined;
            team?: string | undefined;
            project?: string | undefined;
            git?: {
                owner?: string | undefined;
                repo?: string | undefined;
                branch: string;
                localPath?: string | undefined;
            } | undefined;
            llm: {
                provider: "gemini" | "ollama";
                baseUrl?: string | undefined;
                model: string;
                numCtx: number;
            };
        }>): import("@langchain/langgraph").BaseChannel<{
            name: string;
            provider: "render" | "vercel";
            healthUrl: string;
            readyUrl?: string | undefined;
            probeTimeoutMs: number;
            checkIntervalMs: number;
            failureThreshold: number;
            recoveryThreshold: number;
            logLookbackMinutes: number;
            providerServiceId: string;
            workspace?: string | undefined;
            team?: string | undefined;
            project?: string | undefined;
            git?: {
                owner?: string | undefined;
                repo?: string | undefined;
                branch: string;
                localPath?: string | undefined;
            } | undefined;
            llm: {
                provider: "gemini" | "ollama";
                baseUrl?: string | undefined;
                model: string;
                numCtx: number;
            };
        }, import("@langchain/langgraph").OverwriteValue<{
            name: string;
            provider: "render" | "vercel";
            healthUrl: string;
            readyUrl?: string | undefined;
            probeTimeoutMs: number;
            checkIntervalMs: number;
            failureThreshold: number;
            recoveryThreshold: number;
            logLookbackMinutes: number;
            providerServiceId: string;
            workspace?: string | undefined;
            team?: string | undefined;
            project?: string | undefined;
            git?: {
                owner?: string | undefined;
                repo?: string | undefined;
                branch: string;
                localPath?: string | undefined;
            } | undefined;
            llm: {
                provider: "gemini" | "ollama";
                baseUrl?: string | undefined;
                model: string;
                numCtx: number;
            };
        }> | {
            name: string;
            provider: "render" | "vercel";
            healthUrl: string;
            readyUrl?: string | undefined;
            probeTimeoutMs: number;
            checkIntervalMs: number;
            failureThreshold: number;
            recoveryThreshold: number;
            logLookbackMinutes: number;
            providerServiceId: string;
            workspace?: string | undefined;
            team?: string | undefined;
            project?: string | undefined;
            git?: {
                owner?: string | undefined;
                repo?: string | undefined;
                branch: string;
                localPath?: string | undefined;
            } | undefined;
            llm: {
                provider: "gemini" | "ollama";
                baseUrl?: string | undefined;
                model: string;
                numCtx: number;
            };
        }, unknown>;
        (): import("@langchain/langgraph").LastValue<{
            name: string;
            provider: "render" | "vercel";
            healthUrl: string;
            readyUrl?: string | undefined;
            probeTimeoutMs: number;
            checkIntervalMs: number;
            failureThreshold: number;
            recoveryThreshold: number;
            logLookbackMinutes: number;
            providerServiceId: string;
            workspace?: string | undefined;
            team?: string | undefined;
            project?: string | undefined;
            git?: {
                owner?: string | undefined;
                repo?: string | undefined;
                branch: string;
                localPath?: string | undefined;
            } | undefined;
            llm: {
                provider: "gemini" | "ollama";
                baseUrl?: string | undefined;
                model: string;
                numCtx: number;
            };
        }>;
        Root: <S extends import("@langchain/langgraph").StateDefinition>(sd: S) => import("@langchain/langgraph").AnnotationRoot<S>;
    };
    platformToken: {
        (annotation: import("@langchain/langgraph").SingleReducer<string, string>): import("@langchain/langgraph").BaseChannel<string, string | import("@langchain/langgraph").OverwriteValue<string>, unknown>;
        (): import("@langchain/langgraph").LastValue<string>;
        Root: <S extends import("@langchain/langgraph").StateDefinition>(sd: S) => import("@langchain/langgraph").AnnotationRoot<S>;
    };
    gitToken: {
        (annotation: import("@langchain/langgraph").SingleReducer<string | undefined, string | undefined>): import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
        (): import("@langchain/langgraph").LastValue<string | undefined>;
        Root: <S extends import("@langchain/langgraph").StateDefinition>(sd: S) => import("@langchain/langgraph").AnnotationRoot<S>;
    };
    geminiKey: {
        (annotation: import("@langchain/langgraph").SingleReducer<string | undefined, string | undefined>): import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
        (): import("@langchain/langgraph").LastValue<string | undefined>;
        Root: <S extends import("@langchain/langgraph").StateDefinition>(sd: S) => import("@langchain/langgraph").AnnotationRoot<S>;
    };
    trigger: {
        (annotation: import("@langchain/langgraph").SingleReducer<"manual" | "monitor", "manual" | "monitor">): import("@langchain/langgraph").BaseChannel<"manual" | "monitor", "manual" | "monitor" | import("@langchain/langgraph").OverwriteValue<"manual" | "monitor">, unknown>;
        (): import("@langchain/langgraph").LastValue<"manual" | "monitor">;
        Root: <S extends import("@langchain/langgraph").StateDefinition>(sd: S) => import("@langchain/langgraph").AnnotationRoot<S>;
    };
    evidence: import("@langchain/langgraph").BaseChannel<EvidenceItem[], EvidenceItem[] | import("@langchain/langgraph").OverwriteValue<EvidenceItem[]>, unknown>;
    gaps: import("@langchain/langgraph").BaseChannel<EvidenceGap[], EvidenceGap[] | import("@langchain/langgraph").OverwriteValue<EvidenceGap[]>, unknown>;
    hypotheses: import("@langchain/langgraph").BaseChannel<{
        claim: string;
        supportingEvidence: string[];
        contradictingEvidence: string[];
        missingEvidence: string[];
        quotedSnippets: {
            evidenceId: string;
            snippet: string;
        }[];
    }[], {
        claim: string;
        supportingEvidence: string[];
        contradictingEvidence: string[];
        missingEvidence: string[];
        quotedSnippets: {
            evidenceId: string;
            snippet: string;
        }[];
    }[] | import("@langchain/langgraph").OverwriteValue<{
        claim: string;
        supportingEvidence: string[];
        contradictingEvidence: string[];
        missingEvidence: string[];
        quotedSnippets: {
            evidenceId: string;
            snippet: string;
        }[];
    }[]>, unknown>;
    report: {
        (annotation: import("@langchain/langgraph").SingleReducer<any, any>): import("@langchain/langgraph").BaseChannel<any, any, unknown>;
        (): import("@langchain/langgraph").LastValue<any>;
        Root: <S extends import("@langchain/langgraph").StateDefinition>(sd: S) => import("@langchain/langgraph").AnnotationRoot<S>;
    };
}, import("@langchain/langgraph").StateDefinition, {
    gather_platform: {
        evidence: EvidenceItem[];
        gaps: EvidenceGap[];
    } | {
        evidence?: never;
        gaps: EvidenceGap[];
    };
    git_changes: {
        evidence?: never;
        gaps: EvidenceGap[];
    } | {
        gaps?: never;
        evidence: EvidenceItem[];
    };
    hypothesize: {
        gaps?: never;
        hypotheses: any[];
    } | {
        hypotheses: never[];
        gaps: EvidenceGap[];
    };
    normalize_evidence: {
        evidence: EvidenceItem[];
    };
    probe_service: {
        evidence: EvidenceItem[];
    };
    skeptic: {
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
    };
    validate_sources: {};
    write_report: {
        report: {
            status: string;
            summary: string;
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
            contradictions: string[];
            confidence: {
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
            evidenceGaps: EvidenceGap[];
            timeline: {
                evidenceId: string | undefined;
                at: string;
                source: string;
            }[];
            nextSteps: string[];
            meta: {
                provider: "render" | "vercel";
                model: string;
                heuristicConfidence: boolean;
            };
        };
    };
}, unknown, unknown, []>;
//# sourceMappingURL=live-graph.d.ts.map