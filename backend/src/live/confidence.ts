import type { EvidenceGap, EvidenceItem, Hypothesis } from "./types.js";
export const WEIGHTS = {
  independentSources: 15,
  temporalAlignment: 20,
  specificError: 15,
  verifiedQuote: 20,
  contradiction: 15,
  winnerMargin: 15,
  unavailableSourceCap: 65,
} as const;
export function scoreConfidence(
  hypotheses: Hypothesis[],
  evidence: EvidenceItem[],
  gaps: EvidenceGap[],
) {
  const winner = hypotheses[0];
  const sources = new Set(
    evidence
      .filter((e) => winner?.supportingEvidence.includes(e.evidenceId ?? ""))
      .map((e) => e.source),
  ).size;
  const verifiedQuotes = winner?.quotedSnippets.length ?? 0;
  const contradictions = winner?.contradictingEvidence.length ?? 0;
  const raw = Math.min(
    100,
    sources * WEIGHTS.independentSources +
      Math.min(WEIGHTS.specificError, verifiedQuotes * 5) +
      Math.min(WEIGHTS.verifiedQuote, verifiedQuotes * 10) -
      contradictions * WEIGHTS.contradiction,
  );
  const cap = gaps.length ? WEIGHTS.unavailableSourceCap : 100;
  return {
    score: Math.max(0, Math.min(cap, raw)),
    cap,
    breakdown: {
      independentSources: sources,
      verifiedQuotedSnippets: verifiedQuotes,
      contradictions,
      gaps: gaps.map((g) => g.source),
      heuristic: true,
    },
  };
}
