import { EventEmitter } from 'events';
export const logEmitter = new EventEmitter();
// In-memory cache to store logs for incidents so that if the frontend connects late,
// it receives all logs generated so far for that incident.
const logHistory = {};
export function agentLog(incidentId, text, type = 'info') {
    console.log(text);
    if (!logHistory[incidentId]) {
        logHistory[incidentId] = [];
    }
    const logItem = { text, type };
    logHistory[incidentId].push(logItem);
    logEmitter.emit('log', { incidentId, ...logItem });
}
export function getIncidentLogs(incidentId) {
    return logHistory[incidentId] || [];
}
export function clearIncidentLogs(incidentId) {
    delete logHistory[incidentId];
}
//# sourceMappingURL=logger.js.map