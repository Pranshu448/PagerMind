import { Annotation, END, START, StateGraph } from '@langchain/langgraph';
import { SqliteSaver } from '@langchain/langgraph-checkpoint-sqlite';
import { normalizeEvidence, verifyCitations } from '../evidence.js';
import { analyze, validateLlmOutput } from '../llm.js';
import { scoreConfidence } from '../confidence.js';
import { probeUrl } from '../probe.js';
import { withRenderReadOnly } from '../providers/render.js';
import { VercelReadOnlyClient } from '../providers/vercel.js';
import { GitHubReadOnlyClient, localGitCommits } from '../providers/git.js';
const State = Annotation.Root({ config: Annotation, platformToken: Annotation, gitToken: Annotation, geminiKey: Annotation, trigger: Annotation, evidence: Annotation({ reducer: (a, b) => [...a, ...b], default: () => [] }), gaps: Annotation({ reducer: (a, b) => [...a, ...b], default: () => [] }), hypotheses: Annotation({ reducer: (_, b) => b, default: () => [] }), report: Annotation });
const e = (source, content) => ({ source, content, observedAt: new Date().toISOString(), truncated: false });
const g = (source, reason) => ({ source, reason: String(reason) });
export function createLiveGraph() {
    const checkpointer = SqliteSaver.fromConnString('live-checkpoints.db');
    const probe = async (s) => { const results = await Promise.all(Array.from({ length: 3 }, () => probeUrl(s.config.healthUrl, s.config.probeTimeoutMs))); return { evidence: [e('health-probes', JSON.stringify({ results }))] }; };
    const platform = async (s) => {
        try {
            if (s.config.provider === 'render') {
                const rows = await withRenderReadOnly(s.platformToken, async (call, tools) => Promise.allSettled([tools.includes('get_service') ? call('get_service', { serviceId: s.config.providerServiceId, workspaceId: s.config.workspace }) : Promise.reject('service unavailable'), tools.includes('list_deploys') ? call('list_deploys', { serviceId: s.config.providerServiceId, limit: 5, workspaceId: s.config.workspace }) : Promise.reject('deploys unavailable'), tools.includes('list_events') ? call('list_events', { serviceId: s.config.providerServiceId, workspaceId: s.config.workspace }) : Promise.reject('events unavailable'), tools.includes('list_logs') ? call('list_logs', { resource: [s.config.providerServiceId], startTime: new Date(Date.now() - s.config.logLookbackMinutes * 60000).toISOString(), limit: 200 }) : Promise.reject('logs unavailable'), tools.includes('get_metrics') ? call('get_metrics', { resourceId: s.config.providerServiceId, metricTypes: ['cpu_usage', 'memory_usage', 'http_request_count'] }) : Promise.reject('metrics unavailable')]));
                const names = ['platform-service', 'deploy-history', 'platform-events', 'platform-logs', 'platform-metrics'];
                return { evidence: rows.flatMap((r, i) => r.status === 'fulfilled' ? [e(names[i], r.value)] : []), gaps: rows.flatMap((r, i) => r.status === 'rejected' ? [g(names[i], r.reason)] : []) };
            }
            const v = new VercelReadOnlyClient({ token: s.platformToken, ...(s.config.team ? { team: s.config.team } : {}) });
            const deployments = await v.listDeployments(s.config.project ?? s.config.providerServiceId);
            const id = JSON.parse(deployments).deployments?.[0]?.uid;
            if (!id)
                return { evidence: [e('deploy-history', deployments)], gaps: [g('vercel-logs', 'No deployment available.')] };
            const rows = await Promise.allSettled([v.getDeployment(id), v.getDeploymentBuildLogs(id), v.getRuntimeLogs(id, Date.now() - s.config.logLookbackMinutes * 60000)]);
            const names = ['platform-service', 'build-logs', 'runtime-logs'];
            return { evidence: [e('deploy-history', deployments), ...rows.flatMap((r, i) => r.status === 'fulfilled' ? [e(names[i], r.value)] : [])], gaps: rows.flatMap((r, i) => r.status === 'rejected' ? [g(names[i], r.reason)] : []) };
        }
        catch (err) {
            return { gaps: [g('platform', err)] };
        }
    };
    const git = async (s) => { const x = s.config.git; if (!x)
        return { gaps: [g('git', 'Git source was not configured.')] }; try {
        const since = new Date(Date.now() - s.config.logLookbackMinutes * 60000).toISOString();
        const output = x.localPath ? await localGitCommits(x.localPath, since) : x.owner && x.repo ? await new GitHubReadOnlyClient(x.owner, x.repo, s.gitToken).listCommits(since, x.branch) : '';
        return output ? { evidence: [e('git-commits', output)] } : { gaps: [g('git', 'No commits were returned.')] };
    }
    catch (err) {
        return { gaps: [g('git', err)] };
    } };
    const normalize = async (s) => ({ evidence: normalizeEvidence(s.evidence, Math.floor(s.config.llm.numCtx * 3)) });
    const hypothesize = async (s) => { try {
        const o = validateLlmOutput(await analyze(s.config, s.geminiKey, s.evidence.map(x => `${x.evidenceId} [${x.source}]\n${x.content}`).join('\n\n')));
        return { hypotheses: verifyCitations(o.hypotheses, s.evidence) };
    }
    catch (err) {
        return { hypotheses: [], gaps: [g('llm', err)] };
    } };
    const report = async (s) => { const confidence = scoreConfidence(s.hypotheses, s.evidence, s.gaps); const health = s.evidence.find(x => x.source === 'health-probes')?.content ?? ''; const healthy = health.includes('"ok":true') && !health.includes('"ok":false'); const status = healthy && s.trigger === 'manual' ? 'no_incident' : s.hypotheses.length ? 'incident_confirmed' : 'insufficient_evidence'; return { report: { status, summary: status === 'no_incident' ? 'The observed probes were healthy; any anomalies are listed in evidence.' : s.hypotheses[0]?.claim ?? 'Insufficient verified evidence for a diagnosis.', hypotheses: s.hypotheses, contradictions: s.hypotheses.flatMap(x => x.contradictingEvidence), confidence, evidenceGaps: s.gaps, timeline: s.evidence.map(x => ({ evidenceId: x.evidenceId, at: x.observedAt, source: x.source })), nextSteps: ['Review cited evidence and evidence gaps before making changes.'], meta: { provider: s.config.provider, model: s.config.llm.model, heuristicConfidence: true } } }; };
    // Wait for both parallel evidence collectors before normalizing. Separate
    // edges would run normalize twice and assign overlapping E1/E2 IDs.
    return new StateGraph(State).addNode('validate_sources', async () => ({})).addNode('probe_service', probe).addNode('gather_platform', platform).addNode('git_changes', git).addNode('normalize_evidence', normalize).addNode('hypothesize', hypothesize).addNode('skeptic', async (s) => ({ hypotheses: s.hypotheses })).addNode('write_report', report).addEdge(START, 'validate_sources').addEdge('validate_sources', 'probe_service').addEdge('probe_service', 'gather_platform').addEdge('probe_service', 'git_changes').addEdge(['gather_platform', 'git_changes'], 'normalize_evidence').addEdge('normalize_evidence', 'hypothesize').addEdge('hypothesize', 'skeptic').addEdge('skeptic', 'write_report').addEdge('write_report', END).compile({ checkpointer });
}
//# sourceMappingURL=live-graph.js.map