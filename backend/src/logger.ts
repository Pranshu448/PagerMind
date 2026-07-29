import { EventEmitter } from 'events';

export const logEmitter = new EventEmitter();

// In-memory cache to store logs for incidents so that if the frontend connects late,
// it receives all logs generated so far for that incident.
const logHistory: Record<string, Array<{ text: string; type: 'info' | 'success' | 'error' }>> = {};

export function agentLog(incidentId: string, text: string, type: 'info' | 'success' | 'error' = 'info') {
  console.log(text);
  
  if (!logHistory[incidentId]) {
    logHistory[incidentId] = [];
  }
  
  const logItem = { text, type };
  logHistory[incidentId].push(logItem);
  
  logEmitter.emit('log', { incidentId, ...logItem });
}

export function getIncidentLogs(incidentId: string) {
  return logHistory[incidentId] || [];
}

export function clearIncidentLogs(incidentId: string) {
  delete logHistory[incidentId];
}
