import { EventEmitter } from 'events';
export declare const logEmitter: EventEmitter<any>;
export declare function agentLog(incidentId: string, text: string, type?: 'info' | 'success' | 'error'): void;
export declare function getIncidentLogs(incidentId: string): {
    text: string;
    type: 'info' | 'success' | 'error';
}[];
export declare function clearIncidentLogs(incidentId: string): void;
//# sourceMappingURL=logger.d.ts.map