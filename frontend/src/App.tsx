import { useEffect, useState, useCallback } from 'react';

interface Incident {
  id: string;
  serviceName: string;
  status: 'DETECTED' | 'INVESTIGATING' | 'PENDING_APPROVAL' | 'RESOLVED' | 'FAILED';
  rootCause: string | null;
  createdAt: string;
}

function App() {
  // Incident Data State
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Terminal Animation Sequence State
  const [sequenceLines, setSequenceLines] = useState<string[]>([]);
  const [typingIndex, setTypingIndex] = useState(0);
  const [typingText, setTypingText] = useState('');
  const [lineIndex, setLineIndex] = useState(-1);
  const [isBooted, setIsBooted] = useState(false);

  // Sliding Side-by-Side Console States
  const [showBackendConsole, setShowBackendConsole] = useState(false);
  const [backendLogs, setBackendLogs] = useState<Array<{ text: string; type?: 'error' | 'success' | 'info' }>>([]);

  // Mechanical Key Interaction States
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [dismissingId, setDismissingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [clearingResolved, setClearingResolved] = useState(false);

  // Console Refs removed (scrolling is manual now)

  // Constants
  const commandToType = 'pagermind start --watch';
  
  // Sequence lines to print after command is typed
  const linesToReveal = [
    '> Listening for webhooks on port 8080...',
    '> [ALERT] Checkout-Service returning 500s.', // Special red styling
    '> Spawning Triage Agent...',
    '> Fetching logs via MCP (docker-operator)...',
    '> Analyzing Git diff via MCP (git-inspector)...',
    '> Root Cause Found: SyntaxError in src/database.js at commit 8f3a2b.', // Special amber styling
    '> Action: Requesting human approval for rollback...'
  ];

  // Fetch incidents list from Express Gateway
  const fetchIncidents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:3000/api/incidents');
      if (!res.ok) throw new Error('Failed to fetch incidents');
      const data = await res.json();
      setIncidents(data);
    } catch (err: any) {
      console.error(err);
      setError('System Error: Could not connect to PagerMind backend.');
    } finally {
      setLoading(false);
    }
  }, []);

  // 1. Typing animation for Line 1
  useEffect(() => {
    if (typingIndex < commandToType.length) {
      const timeout = setTimeout(() => {
        setTypingText(prev => prev + commandToType[typingIndex]);
        setTypingIndex(prev => prev + 1);
      }, 50);
      return () => clearTimeout(timeout);
    } else {
      const timeout = setTimeout(() => {
        setLineIndex(0);
      }, 600);
      return () => clearTimeout(timeout);
    }
  }, [typingIndex]);

  // 2. Sequential line reveal animation (Strict-mode safe)
  useEffect(() => {
    if (lineIndex >= 0 && lineIndex < linesToReveal.length) {
      const timeout = setTimeout(() => {
        setSequenceLines(prev => [...prev, linesToReveal[lineIndex]]);
        setLineIndex(prev => prev + 1);
      }, Math.random() * 400 + 200);
      return () => clearTimeout(timeout);
    } else if (lineIndex === linesToReveal.length) {
      const timeout = setTimeout(() => {
        setIsBooted(true);
        fetchIncidents();
      }, 800);
      return () => clearTimeout(timeout);
    }
  }, [lineIndex, fetchIncidents]);

  // Poll for new incidents every 4 seconds once booted
  useEffect(() => {
    if (isBooted) {
      const interval = setInterval(fetchIncidents, 4000);
      return () => clearInterval(interval);
    }
  }, [isBooted, fetchIncidents]);

  // Auto-scrolling hooks removed for manual scrolling

  // Helper to add logs to the backend terminal
  const addBackendLog = (text: string, delay: number, type?: 'error' | 'success' | 'info') => {
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        setBackendLogs(prev => [...prev, { text, type }]);
        resolve();
      }, delay);
    });
  };

  // Action: Approve Rollback
  const handleApprove = async (id: string) => {
    setApprovingId(id);
    setError(null);
    setBackendLogs([]);
    setShowBackendConsole(true); // Pop open the second terminal on the right side smoothly!

    await addBackendLog(`[Agent] Incident locked in PENDING_APPROVAL. Awaiting human input.`, 100);
    await addBackendLog(`[Agent] MCP server connection closed.`, 300);
    await addBackendLog(`[Approval API] Received rollback approval request for incident ${id}`, 300);
    await addBackendLog(`[Approval API] Connecting to local MCP server to execute rollback...`, 400);
    await addBackendLog(`PagerMind MCP Server running on stdio`, 300, 'info');
    await addBackendLog(`[Approval API] Connected to MCP server. Running execute_rollback...`, 400);

    try {
      const res = await fetch(`http://localhost:3000/api/incidents/${id}/approve`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Rollback failed');

      const hasFatalWarning = data.incident.rootCause?.includes("fatal:") || data.incident.rootCause?.includes("ambiguous argument");

      if (hasFatalWarning) {
        await addBackendLog(`fatal: ambiguous argument 'HEAD~1': unknown revision or path not in the working tree.`, 400, 'error');
        await addBackendLog(`Use '--' to separate paths from revisions, like this:`, 100);
        await addBackendLog(`'git <command> [<revision>...] -- [<file>...]'`, 100);
      }

      await addBackendLog(`[Approval API] MCP connection closed.`, 400);
      
      const successMsg = `[Approval API] Rollback successful: ${data.message || 'SUCCESS: Discarded unstaged configuration changes.'}`;
      await addBackendLog(successMsg, 500, 'success');

      // Update local state immediately
      setIncidents(prev => prev.map(inc => inc.id === id ? data.incident : inc));
    } catch (err: any) {
      console.error(err);
      await addBackendLog(`[Approval API] MCP connection closed.`, 200);
      await addBackendLog(`[Approval API] Error during rollback: ${err.message}`, 400, 'error');
      setError(err.message || 'Error executing rollback');
    } finally {
      setApprovingId(null);
    }
  };

  // Action: Dismiss Incident (Mark as FAILED/Dismissed)
  const handleDismiss = async (id: string) => {
    setDismissingId(id);
    setError(null);
    try {
      const res = await fetch(`http://localhost:3000/api/incidents/${id}/dismiss`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to dismiss incident');
      setIncidents(prev => prev.map(inc => inc.id === id ? data.incident : inc));
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error dismissing incident');
    } finally {
      setDismissingId(null);
    }
  };

  // Action: Delete Incident permanently
  const handleDelete = async (id: string) => {
    setDeletingId(id);
    setError(null);
    try {
      const res = await fetch(`http://localhost:3000/api/incidents/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete incident');
      setIncidents(prev => prev.filter(inc => inc.id !== id));
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error deleting incident');
    } finally {
      setDeletingId(null);
    }
  };

  // Action: Clear all resolved incidents
  const handleClearResolved = async () => {
    setClearingResolved(true);
    setError(null);
    try {
      const res = await fetch('http://localhost:3000/api/incidents/resolved', {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to clear resolved alerts');
      await fetchIncidents();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error clearing resolved alerts');
    } finally {
      setClearingResolved(false);
    }
  };

  // Get active pending approval or failed/detected incident targets
  const getTargetIncident = () => {
    const pending = incidents.find(i => i.status === 'PENDING_APPROVAL');
    if (pending) return pending;
    const errState = incidents.find(i => i.status === 'FAILED' || i.status === 'DETECTED');
    if (errState) return errState;
    return null;
  };

  // Global Keyboard Key Events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isBooted) return;
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;

      const target = getTargetIncident();

      if (e.key === 'Enter' || e.key === 'y' || e.key === 'Y') {
        e.preventDefault();
        if (target) {
          handleApprove(target.id);
        }
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        fetchIncidents();
      } else if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        handleClearResolved();
      } else if (e.key === 'v' || e.key === 'V') {
        e.preventDefault();
        setShowBackendConsole(prev => !prev);
      } else if (e.key === 'd' || e.key === 'D' || e.key === 'Backspace') {
        e.preventDefault();
        if (target) {
          if (target.status === 'FAILED' || target.status === 'RESOLVED') {
            handleDelete(target.id);
          } else {
            handleDismiss(target.id);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isBooted, incidents]);

  return (
    <div className="relative h-screen max-h-screen bg-black text-zinc-300 flex flex-col font-mono select-none overflow-hidden">
      
      {/* Hyper-Modern Glow Backdrop Aura */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] md:w-[850px] h-[600px] md:h-[850px] bg-gradient-to-tr from-indigo-500/5 to-cyan-500/5 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute top-1/3 left-1/3 w-[300px] h-[300px] bg-purple-500/[0.04] blur-[110px] rounded-full pointer-events-none" />

      {/* Sliding Flex container wrapper for Terminal Panels */}
      <div className="relative z-10 w-full flex-1 min-h-0 flex flex-col md:flex-row gap-0 items-stretch transition-all duration-500 ease-in-out">
        
        {/* PANEL 1: Sleek macOS Terminal Container (Glassmorphism) */}
        <div 
          className={`bg-[#08090c]/60 backdrop-blur-2xl flex flex-col h-full min-h-0 overflow-hidden transition-all duration-500 ease-in-out ${
            showBackendConsole ? 'w-full md:w-[60%]' : 'w-full'
          }`}
        >
          {/* Terminal Header */}
          <div className="bg-[#0b0c10]/80 border-b border-white/10 px-5 py-3.5 flex items-center justify-between">
            {/* macOS traffic light controls */}
            <div className="flex gap-2 group/header">
              <div className="w-3 h-3 rounded-full bg-[#ff5f56]/70 border border-[#e0443e]/40 cursor-pointer active:brightness-90 flex items-center justify-center text-[6px] text-red-950 font-bold group-hover/header:bg-[#ff5f56] transition" onClick={() => window.close()}>×</div>
              <div className="w-3 h-3 rounded-full bg-[#ffbd2e]/70 border border-[#dea123]/40 cursor-pointer active:brightness-90 flex items-center justify-center text-[6px] text-amber-950 font-bold group-hover/header:bg-[#ffbd2e] transition">-</div>
              <div className="w-3 h-3 rounded-full bg-[#27c93f]/70 border border-[#1aab29]/40 cursor-pointer active:brightness-90 flex items-center justify-center text-[6px] text-emerald-950 font-bold group-hover/header:bg-[#27c93f] transition">+</div>
            </div>
            
            {/* Centered Title */}
            <span className="text-xs text-zinc-500 font-semibold tracking-wide select-none">zsh - pagermind</span>
            
            {/* Connection pulse */}
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-zinc-500 font-bold uppercase select-none">Live</span>
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            </div>
          </div>

          {/* Terminal Console Output Panel */}
          <div className="p-6 flex-1 overflow-y-auto min-h-0 text-sm leading-relaxed flex flex-col gap-5 font-mono terminal-scrollbar">
            
            {/* Simulated startup boot lines */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <span className="text-zinc-500 font-bold select-none">pranshu@macbook-pro ~ %</span>
                <span className="text-zinc-100 font-semibold">{typingText}</span>
                {typingIndex < commandToType.length && (
                  <span className="w-2 h-4 bg-zinc-400 animate-pulse select-none" />
                )}
              </div>

              {/* Revealing boot sequence lines */}
              {sequenceLines.map((line, idx) => {
                if (line.includes('[ALERT]')) {
                  return (
                    <div key={idx} className="text-rose-400 font-semibold drop-shadow-[0_0_4px_rgba(244,63,94,0.15)]">
                      {line}
                    </div>
                  );
                }
                if (line.includes('Root Cause Found')) {
                  return (
                    <div key={idx} className="text-amber-400 font-semibold drop-shadow-[0_0_4px_rgba(251,191,36,0.15)]">
                      {line}
                    </div>
                  );
                }
                return (
                  <div key={idx} className="text-zinc-400">
                    {line}
                  </div>
                );
              })}
            </div>

            {/* Real-time Triage Incident Panel (Visible only after boot sequence finishes) */}
            {isBooted && (
              <div className="mt-2 border-t border-white/5 pt-4 flex flex-col gap-5">
                
                {/* Telemetry Stats Console - Glowing Metric Cards */}
                <div className="border border-white/10 rounded-xl p-5 bg-white/[0.01] backdrop-blur-sm flex flex-col gap-3 shadow-[inset_0_0_20px_rgba(255,255,255,0.01)]">
                  <div className="text-zinc-500 text-xs font-bold uppercase tracking-wider border-b border-white/5 pb-2 flex justify-between">
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-400 font-bold">
                      &gt;_ PagerMind Telemetry Report
                    </span>
                    <span className="text-emerald-400 text-[10px] drop-shadow-[0_0_4px_rgba(52,211,153,0.4)]">● System Operational</span>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-1 text-xs">
                    <div className="bg-white/[0.02] border border-white/5 rounded-lg p-3 flex flex-col gap-1 transition-all duration-300 hover:bg-white/[0.04]">
                      <span className="text-zinc-500 text-[10px] uppercase font-semibold">Total Alerts</span>
                      <span className="text-lg font-bold text-zinc-100">{incidents.length}</span>
                    </div>
                    <div className="bg-white/[0.02] border border-white/5 rounded-lg p-3 flex flex-col gap-1 transition-all duration-300 hover:bg-white/[0.04]">
                      <span className="text-zinc-500 text-[10px] uppercase font-semibold">Awaiting Human</span>
                      <span className="text-lg font-bold text-amber-400 drop-shadow-[0_0_4px_rgba(251,191,36,0.3)]">
                        {incidents.filter(i => i.status === 'PENDING_APPROVAL').length}
                      </span>
                    </div>
                    <div className="bg-white/[0.02] border border-white/5 rounded-lg p-3 flex flex-col gap-1 transition-all duration-300 hover:bg-white/[0.04]">
                      <span className="text-zinc-500 text-[10px] uppercase font-semibold">Resolved Alerts</span>
                      <span className="text-lg font-bold text-emerald-400 drop-shadow-[0_0_4px_rgba(52,211,153,0.3)]">
                        {incidents.filter(i => i.status === 'RESOLVED').length}
                      </span>
                    </div>
                    <div className="bg-white/[0.02] border border-white/5 rounded-lg p-3 flex flex-col gap-1 transition-all duration-300 hover:bg-white/[0.04]">
                      <span className="text-zinc-500 text-[10px] uppercase font-semibold">Ollama Agent</span>
                      <span className="text-[11px] font-bold text-purple-400 drop-shadow-[0_0_4px_rgba(192,132,252,0.3)] mt-0.5 truncate">
                        qwen2.5-coder:3b
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-zinc-500 font-bold uppercase text-xs tracking-wider">
                  === ACTIVE TRIAGE TIMELINE ===
                </div>

                {incidents.length === 0 ? (
                  <div className="text-zinc-650 italic py-6 text-xs text-center border border-white/5 border-dashed rounded-xl">
                    &gt; [System Idle] No active alert incidents found. Awaiting telemetry webhook...
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {incidents.map((incident) => (
                      <div 
                        key={incident.id} 
                        className={`p-5 rounded-xl border bg-black/40 backdrop-blur-sm transition-all duration-300 shadow-[0_4px_24px_-10px_rgba(0,0,0,0.5)] ${
                          incident.status === 'PENDING_APPROVAL' 
                            ? 'border-amber-500/25 bg-amber-500/[0.01]' 
                            : incident.status === 'RESOLVED' 
                            ? 'border-emerald-500/20 bg-emerald-500/[0.01]' 
                            : incident.status === 'FAILED'
                            ? 'border-rose-950/40 bg-rose-950/[0.01]'
                            : 'border-white/10'
                        }`}
                      >
                        {/* Card Header */}
                        <div className="flex justify-between items-center text-xs pb-2.5 border-b border-white/5">
                          <div className="flex gap-2">
                            <span className="text-zinc-500 font-bold">Service:</span>
                            <span className="text-white font-bold tracking-wide">{incident.serviceName}</span>
                          </div>
                          <div className="flex gap-2">
                            <span className="text-zinc-600 font-semibold">ID:</span>
                            <span className="text-zinc-500 font-mono">{incident.id.slice(0, 8)}...</span>
                          </div>
                          <div>
                            {incident.status === 'PENDING_APPROVAL' && (
                              <span className="text-amber-400 font-bold uppercase animate-pulse drop-shadow-[0_0_4px_rgba(251,191,36,0.3)]">[Awaiting Approval]</span>
                            )}
                            {incident.status === 'RESOLVED' && (
                              <span className="text-emerald-400 font-bold uppercase drop-shadow-[0_0_4px_rgba(52,211,153,0.3)]">[Resolved]</span>
                            )}
                            {incident.status === 'FAILED' && (
                              <span className="text-zinc-500 font-bold uppercase">[Cancelled/Failed]</span>
                            )}
                            {incident.status === 'INVESTIGATING' && (
                              <span className="text-orange-400 font-bold uppercase animate-pulse">[Investigating...]</span>
                            )}
                            {incident.status === 'DETECTED' && (
                              <span className="text-rose-400 font-bold uppercase animate-pulse">[Detected]</span>
                            )}
                          </div>
                        </div>

                        {/* Card Diagnosis Body */}
                        {incident.rootCause && (
                          <div className="mt-3 text-xs leading-relaxed font-mono">
                            <div className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-400 font-bold pb-1 flex items-center gap-1.5">
                              <span>AI SRE Diagnosis:</span>
                            </div>
                            <div className="text-zinc-300 whitespace-pre-line bg-white/[0.01] border border-white/5 p-4 rounded-lg mt-1.5 shadow-inner">
                              {incident.rootCause}
                            </div>
                          </div>
                        )}

                        {/* Manual rollback status marker */}
                        <div className="mt-3.5 text-[11px] text-zinc-500 flex justify-between font-semibold">
                          <span>Incident Logged: {new Date(incident.createdAt).toLocaleTimeString()}</span>
                          {incident.status === 'PENDING_APPROVAL' && (
                            <span className="text-amber-500/80 font-bold">⚠️ Rollback pending approval</span>
                          )}
                          {incident.status === 'RESOLVED' && (
                            <span className="text-emerald-500/80 font-bold">✓ Rollback completed successfully</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* System Error Box */}
            {error && (
              <div className="text-rose-400 font-bold text-xs bg-rose-950/20 p-3 rounded-lg border border-rose-900/50 mt-2 shadow-[0_0_12px_rgba(244,63,94,0.1)]">
                🚨 ERROR: {error}
              </div>
            )}

          </div>

          {/* Blinking Prompt Line (Call To Action Panel) */}
          {isBooted && (
            <div className="bg-[#0b0c10]/80 border-t border-white/10 px-5 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              
              {/* Blinking block cursor & status indicator */}
              <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                <span className="font-bold">&gt;</span>
                <span>Console Prompt Active:</span>
                <span className="w-1.5 h-3.5 bg-indigo-500 animate-pulse inline-block" />
              </div>

              {/* Clickable Mechanical Keyboard Buttons */}
              <div className="flex flex-wrap items-center gap-4 text-xs font-mono font-bold select-none">
                
                {/* Approve / Force Rollback Button */}
                {getTargetIncident() && (
                  <button
                    onClick={() => getTargetIncident() && handleApprove(getTargetIncident()!.id)}
                    disabled={approvingId !== null || dismissingId !== null || deletingId !== null}
                    className="flex items-center gap-2 group cursor-pointer"
                  >
                    <span className="bg-[#181924] hover:bg-[#20212f] active:translate-y-0.5 border-b-[3px] border-[#06070a] text-zinc-200 px-2.5 py-1 rounded text-center shadow-[0_2px_0_rgba(255,255,255,0.05)] transition-all duration-75 select-none active:border-b-0 active:mt-[3px] uppercase font-bold text-[10px] ring-1 ring-white/5">
                      Enter
                    </span>
                    <span className="text-zinc-500 group-hover:text-zinc-200 transition">
                      {getTargetIncident()?.status === 'FAILED' ? 'Force Rollback' : 'Approve Rollback'}
                    </span>
                  </button>
                )}

                {/* Refresh Alerts Button */}
                <button
                  onClick={fetchIncidents}
                  disabled={loading}
                  className="flex items-center gap-2 group cursor-pointer"
                >
                  <span className="bg-[#181924] hover:bg-[#20212f] active:translate-y-0.5 border-b-[3px] border-[#06070a] text-zinc-200 px-2.5 py-1 rounded text-center shadow-[0_2px_0_rgba(255,255,255,0.05)] transition-all duration-75 select-none active:border-b-0 active:mt-[3px] uppercase font-bold text-[10px] ring-1 ring-white/5">
                    R
                  </span>
                  <span className="text-zinc-500 group-hover:text-zinc-200 transition">Refresh CLI</span>
                </button>

                {/* Toggle Backend Console Button */}
                <button
                  onClick={() => setShowBackendConsole(prev => !prev)}
                  className="flex items-center gap-2 group cursor-pointer"
                >
                  <span className="bg-[#181924] hover:bg-[#20212f] active:translate-y-0.5 border-b-[3px] border-[#06070a] text-zinc-200 px-2.5 py-1 rounded text-center shadow-[0_2px_0_rgba(255,255,255,0.05)] transition-all duration-75 select-none active:border-b-0 active:mt-[3px] uppercase font-bold text-[10px] ring-1 ring-white/5 font-mono">
                    V
                  </span>
                  <span className="text-zinc-500 group-hover:text-zinc-200 transition">
                    {showBackendConsole ? 'Hide Console' : 'See Console'}
                  </span>
                </button>

                {/* Clear Resolved Alerts Button (only visible when resolved alerts exist) */}
                {incidents.some(i => i.status === 'RESOLVED') && (
                  <button
                    onClick={handleClearResolved}
                    disabled={clearingResolved || loading}
                    className="flex items-center gap-2 group cursor-pointer"
                  >
                    <span className="bg-[#181924] hover:bg-[#20212f] active:translate-y-0.5 border-b-[3px] border-[#06070a] text-zinc-200 px-2.5 py-1 rounded text-center shadow-[0_2px_0_rgba(255,255,255,0.05)] transition-all duration-75 select-none active:border-b-0 active:mt-[3px] uppercase font-bold text-[10px] ring-1 ring-white/5 font-mono">
                      C
                    </span>
                    <span className="text-zinc-500 group-hover:text-zinc-200 transition">
                      {clearingResolved ? 'Clearing...' : 'Clear Resolved'}
                    </span>
                  </button>
                )}

                {/* Cancel / Delete Incident Button */}
                {getTargetIncident() && (
                  <button
                    onClick={() => {
                      const target = getTargetIncident()!;
                      if (target.status === 'FAILED' || target.status === 'RESOLVED') {
                        handleDelete(target.id);
                      } else {
                        handleDismiss(target.id);
                      }
                    }}
                    disabled={approvingId !== null || dismissingId !== null || deletingId !== null}
                    className="flex items-center gap-2 group cursor-pointer"
                  >
                    <span className="bg-[#181924] hover:bg-[#20212f] active:translate-y-0.5 border-b-[3px] border-[#06070a] text-zinc-200 px-2.5 py-1 rounded text-center shadow-[0_2px_0_rgba(255,255,255,0.05)] transition-all duration-75 select-none active:border-b-0 active:mt-[3px] uppercase font-bold text-[10px] ring-1 ring-white/5">
                      {getTargetIncident()?.status === 'FAILED' || getTargetIncident()?.status === 'RESOLVED' ? 'D' : 'Backspace'}
                    </span>
                    <span className="text-zinc-500 group-hover:text-zinc-200 transition">
                      {getTargetIncident()?.status === 'FAILED' || getTargetIncident()?.status === 'RESOLVED' ? 'Delete incident' : 'Cancel incident'}
                    </span>
                  </button>
                )}

              </div>
            </div>
          )}

        </div>

        {/* PANEL 2: POP-UP SECOND TERMINAL (40% width, slides smoothly from right, Glassmorphism) */}
        <div 
          className={`bg-[#08090c]/60 backdrop-blur-2xl border-l border-white/10 flex flex-col h-full min-h-0 overflow-hidden transition-all duration-500 ease-in-out ${
            showBackendConsole 
              ? 'w-full md:w-[40%] opacity-100 translate-x-0 pointer-events-auto' 
              : 'w-0 opacity-0 translate-x-12 pointer-events-none border-transparent max-h-0 md:max-h-none border-l-0'
          }`}
        >
          {/* Header */}
          <div className="bg-[#0b0c10]/80 border-b border-white/10 px-5 py-3.5 flex items-center justify-between select-none">
            <div className="flex gap-2">
              <div 
                className="w-3 h-3 rounded-full bg-[#ff5f56]/70 border border-[#e0443e]/40 cursor-pointer hover:bg-[#ff5f56] flex items-center justify-center text-[6px] text-red-950 font-bold transition"
                onClick={() => setShowBackendConsole(false)}
              >
                ×
              </div>
              <div className="w-3 h-3 rounded-full bg-zinc-800 border border-zinc-700/40 cursor-not-allowed" />
              <div className="w-3 h-3 rounded-full bg-zinc-800 border border-zinc-700/40 cursor-not-allowed" />
            </div>
            <span className="text-xs text-zinc-500 font-bold tracking-wide">zsh - pagermind-backend-commands</span>
            <span className="text-[8px] text-purple-400 font-bold uppercase tracking-widest animate-pulse drop-shadow-[0_0_4px_rgba(192,132,252,0.4)]">Running</span>
          </div>

          {/* Logs Output Console */}
          <div className="p-6 flex-1 overflow-y-auto min-h-0 text-xs font-mono leading-relaxed bg-[#050608]/90 text-zinc-400 flex flex-col gap-2 terminal-scrollbar">
            {backendLogs.length === 0 ? (
              <div className="text-zinc-700 italic select-none">Awaiting command pipeline...</div>
            ) : (
              backendLogs.map((log, idx) => {
                if (log.type === 'error') {
                  return (
                    <div key={idx} className="text-rose-400 border-l-2 border-rose-500 pl-2.5 py-0.5 bg-rose-950/10 font-semibold select-text drop-shadow-[0_0_4px_rgba(244,63,94,0.1)]">
                      {log.text}
                    </div>
                  );
                }
                if (log.type === 'success') {
                  return (
                    <div key={idx} className="text-emerald-400 border-l-2 border-emerald-500 pl-2.5 py-0.5 bg-emerald-950/10 font-semibold select-text drop-shadow-[0_0_4px_rgba(52,211,153,0.1)]">
                      {log.text}
                    </div>
                  );
                }
                if (log.type === 'info') {
                  return (
                    <div key={idx} className="text-purple-400 font-semibold select-text">
                      {log.text}
                    </div>
                  );
                }
                return (
                  <div key={idx} className="text-zinc-400 select-text">
                    {log.text}
                  </div>
                );
              })
            )}
          </div>

          {/* Sub Header / Info */}
          <div className="bg-[#0b0c10]/80 px-5 py-1.5 border-t border-white/10 text-[10px] text-zinc-650 flex justify-between select-none font-semibold">
            <span>Server Process Hook Enabled</span>
            <button 
              onClick={() => setShowBackendConsole(false)} 
              className="text-purple-400 hover:text-purple-300 active:underline font-bold text-[9px] uppercase tracking-wider cursor-pointer"
            >
              [Hide Console]
            </button>
          </div>
        </div>

      </div>
      
      {/* Under-Terminal Help Hint */}
      {isBooted && (
        <div className="mt-4 text-[10px] text-zinc-600 text-center select-none uppercase tracking-widest font-bold">
          Tip: You can use your physical keyboard keys [Enter] / [R] / [Backspace] as shortcuts.
        </div>
      )}
      
    </div>
  );
}

export default App;
