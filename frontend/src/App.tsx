import { useEffect, useState } from 'react';
import { 
  ShieldAlert, 
  Activity, 
  GitPullRequest, 
  CheckCircle, 
  AlertOctagon, 
  RefreshCw, 
  Terminal, 
  Cpu, 
  Clock
} from 'lucide-react';

interface Incident {
  id: string;
  serviceName: string;
  status: 'DETECTED' | 'INVESTIGATING' | 'PENDING_APPROVAL' | 'RESOLVED' | 'FAILED';
  rootCause: string | null;
  createdAt: string;
}

function App() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchIncidents = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('http://localhost:3000/api/incidents');
      if (!res.ok) throw new Error('Failed to fetch incidents');
      const data = await res.json();
      setIncidents(data);
    } catch (err: any) {
      console.error(err);
      setError('Could not connect to PagerMind backend. Make sure it is running on port 3000.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
    // Poll every 5 seconds for live updates
    const interval = setInterval(fetchIncidents, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleApprove = async (id: string) => {
    setApprovingId(id);
    setError(null);
    try {
      const res = await fetch(`http://localhost:3000/api/incidents/${id}/approve`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to approve rollback');
      
      // Update local state immediately
      setIncidents(prev => prev.map(inc => inc.id === id ? data.incident : inc));
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error executing rollback');
    } finally {
      setApprovingId(null);
    }
  };

  const getStatusBadge = (status: Incident['status']) => {
    switch (status) {
      case 'DETECTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-950 text-red-400 border border-red-800 animate-pulse">
            <ShieldAlert size={12} /> DETECTED
          </span>
        );
      case 'INVESTIGATING':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-orange-950 text-orange-400 border border-orange-800">
            <Activity size={12} className="animate-spin" /> INVESTIGATING
          </span>
        );
      case 'PENDING_APPROVAL':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-950 text-amber-400 border border-amber-800 animate-bounce">
            <GitPullRequest size={12} /> AWAITING APPROVAL
          </span>
        );
      case 'RESOLVED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800">
            <CheckCircle size={12} /> RESOLVED
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-zinc-800 text-zinc-400 border border-zinc-700">
            <AlertOctagon size={12} /> FAILED
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#0d0e15] text-zinc-100 flex flex-col font-sans">
      {/* Top Banner */}
      <header className="border-b border-zinc-800 bg-[#12131c] px-6 py-4 flex items-center justify-between sticky top-0 z-50 shadow-md">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white font-bold shadow-lg shadow-purple-500/20">
            PM
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
              PagerMind
            </h1>
            <p className="text-xs text-zinc-500 font-medium">Autonomous Incident Response Room</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={fetchIncidents}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-950 text-zinc-300 rounded-lg border border-zinc-700 transition disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8 flex flex-col gap-6">
        
        {/* Error Alert Box */}
        {error && (
          <div className="bg-red-950/40 border border-red-900/60 rounded-xl p-4 flex gap-3 text-red-300 text-sm">
            <AlertOctagon className="shrink-0 text-red-500" size={20} />
            <div>
              <h4 className="font-bold mb-1">Outage Room Error</h4>
              <p>{error}</p>
            </div>
          </div>
        )}

        {/* Dashboard Panels */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          
          {/* SRE Stats Card */}
          <div className="md:col-span-1 bg-[#12131c] border border-zinc-800/80 rounded-2xl p-5 flex flex-col gap-4 shadow-xl">
            <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Triage Stats</h3>
            
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between p-3 bg-[#181924] rounded-xl border border-zinc-800">
                <span className="text-xs font-semibold text-zinc-400">Total Alerts</span>
                <span className="text-lg font-bold text-white">{incidents.length}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-[#181924] rounded-xl border border-zinc-800">
                <span className="text-xs font-semibold text-zinc-400">Awaiting Human</span>
                <span className="text-lg font-bold text-amber-400">
                  {incidents.filter(i => i.status === 'PENDING_APPROVAL').length}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-[#181924] rounded-xl border border-zinc-800">
                <span className="text-xs font-semibold text-zinc-400">Resolved</span>
                <span className="text-lg font-bold text-emerald-400">
                  {incidents.filter(i => i.status === 'RESOLVED').length}
                </span>
              </div>
            </div>

            <div className="text-[11px] text-zinc-500 leading-relaxed border-t border-zinc-800 pt-3">
              <p className="font-semibold text-zinc-400 mb-1">Human-in-the-Loop Protocol:</p>
              AI investigates the crash, determines root cause, and locks the incident for manual confirmation.
            </div>
          </div>

          {/* Incidents List Container */}
          <div className="md:col-span-3 flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
                <Terminal size={18} className="text-purple-500" />
                Active Incident Timeline
              </h2>
              <span className="text-xs text-zinc-500 font-medium">Auto-refreshing every 5s</span>
            </div>

            {incidents.length === 0 ? (
              <div className="bg-[#12131c] border border-zinc-800/80 border-dashed rounded-2xl py-16 px-4 text-center text-zinc-500">
                <Cpu size={40} className="mx-auto mb-3 text-zinc-700" />
                <p className="text-sm font-semibold">No active incidents detected.</p>
                <p className="text-xs text-zinc-600 mt-1">Send a webhook request to register a production crash.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {incidents.map((incident) => (
                  <div 
                    key={incident.id} 
                    className={`bg-[#12131c] border transition-all duration-300 rounded-2xl p-6 flex flex-col gap-4 shadow-xl ${
                      incident.status === 'PENDING_APPROVAL' 
                        ? 'border-amber-500/30 bg-gradient-to-b from-[#12131c] to-[#1c1815]' 
                        : incident.status === 'RESOLVED' 
                        ? 'border-emerald-500/20' 
                        : 'border-zinc-800/80'
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold text-white tracking-wide">{incident.serviceName}</span>
                          <span className="text-xs text-zinc-600 select-none">|</span>
                          <span className="text-xs font-mono text-zinc-500">{incident.id}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-zinc-500 mt-0.5">
                          <Clock size={12} />
                          <span>{new Date(incident.createdAt).toLocaleString()}</span>
                        </div>
                      </div>
                      <div>
                        {getStatusBadge(incident.status)}
                      </div>
                    </div>

                    {/* AI Diagnosis Content */}
                    {incident.rootCause && (
                      <div className="bg-[#181924] border border-zinc-800/80 rounded-xl p-4 flex flex-col gap-2">
                        <div className="flex items-center gap-2 text-xs font-bold text-purple-400">
                          <Cpu size={14} />
                          <span>Qwen 2.5 Coder SRE Diagnosis</span>
                        </div>
                        <p className="text-sm text-zinc-300 leading-relaxed font-mono whitespace-pre-line">
                          {incident.rootCause}
                        </p>
                      </div>
                    )}

                    {/* Action Panel */}
                    <div className="border-t border-zinc-800/80 pt-4 flex items-center justify-between gap-4">
                      <div className="text-xs text-zinc-500">
                        {incident.status === 'PENDING_APPROVAL' && (
                          <span className="text-amber-500/80 font-medium">⚠️ Action required: Verify findings and execute recovery.</span>
                        )}
                        {incident.status === 'RESOLVED' && (
                          <span className="text-emerald-500/80 font-medium">✓ Service recovery completed successfully.</span>
                        )}
                        {incident.status === 'INVESTIGATING' && (
                          <span className="text-orange-500/80 font-medium animate-pulse">⚙ AI is analyzing logs and git diff...</span>
                        )}
                        {incident.status === 'DETECTED' && (
                          <span className="text-red-500/80 font-medium">⏳ Spawning agent loop...</span>
                        )}
                        {incident.status === 'FAILED' && (
                          <span className="text-red-500/80 font-medium">✗ Agent failed to complete triage.</span>
                        )}
                      </div>

                      {incident.status === 'PENDING_APPROVAL' && (
                        <button
                          onClick={() => handleApprove(incident.id)}
                          disabled={approvingId !== null}
                          className="flex items-center gap-2 px-4 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-zinc-950 rounded-xl transition shadow-lg shadow-amber-500/10 disabled:opacity-50"
                        >
                          {approvingId === incident.id ? (
                            <>
                              <RefreshCw size={14} className="animate-spin" />
                              Running Rollback...
                            </>
                          ) : (
                            <>
                              <CheckCircle size={14} />
                              Approve Rollback
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800 py-6 text-center text-xs text-zinc-600 font-medium bg-[#12131c]">
        PagerMind SRE Console © 2026. Made with ❤️ for local autonomous operations.
      </footer>
    </div>
  );
}

export default App;
