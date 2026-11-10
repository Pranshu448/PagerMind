import { useMemo, useState } from "react";

const API =
  import.meta.env.VITE_LIVE_API_URL ?? "http://localhost:3000/api/live";
type Service = {
  id: string;
  name: string;
  provider: string;
  monitorState: string;
  config: { providerServiceId: string; healthUrl: string };
};
type Gap = { source: string; reason: string };
type Report = {
  status: string;
  summary: string;
  hypotheses: Array<{ claim: string }>;
  evidenceGaps: Gap[];
  timeline: Array<{ source: string }>;
  nextSteps: string[];
  confidence?: { score: number };
};
type Run = {
  id: string;
  status: string;
  trigger: string;
  startedAt: string;
  completedAt?: string;
  report?: Report | null;
  events?: Array<{ type: string; content: string }>;
};
const defaults = {
  name: "",
  provider: "render",
  providerServiceId: "",
  healthUrl: "",
  readyUrl: "",
  providerToken: "",
  probeTimeoutMs: 10000,
  checkIntervalMs: 30000,
  failureThreshold: 3,
  recoveryThreshold: 3,
  logLookbackMinutes: 30,
  llmProvider: "ollama",
  baseUrl: "http://localhost:11434",
  model: "qwen2.5-coder:3b",
  numCtx: 8192,
};

export function LiveMode() {
  const [token, setToken] = useState("");
  const [services, setServices] = useState<Service[]>([]);
  const [form, setForm] = useState(defaults);
  const [message, setMessage] = useState(
    "Enter the Live API token, then refresh services.",
  );
  const [connection, setConnection] = useState<Record<string, string> | null>(
    null,
  );
  const [runs, setRuns] = useState<Record<string, Run[]>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const headers = useMemo(
    () => ({ "Content-Type": "application/json", "X-Live-Token": token }),
    [token],
  );
  const update = (key: string, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));
  const errorMessage = async (response: Response, fallback: string) =>
    (await response.json().catch(() => null))?.error ?? fallback;
  const loadRuns = async (id: string) => {
    const response = await fetch(`${API}/services/${id}/runs`, { headers });
    if (!response.ok)
      throw new Error(
        await errorMessage(response, "Unable to load diagnosis results."),
      );
    const data = (await response.json()) as Run[];
    setRuns((current) => ({ ...current, [id]: data }));
    return data;
  };
  const refresh = async () => {
    if (!token.trim())
      return setMessage("Enter the Live API token to load connected services.");
    setBusy("refresh");
    setConnection(null);
    try {
      const response = await fetch(`${API}/services`, { headers });
      if (!response.ok)
        throw new Error(
          await errorMessage(response, "Unable to load services."),
        );
      const data = (await response.json()) as Service[];
      setServices(data);
      await Promise.all(data.map((service) => loadRuns(service.id)));
      setMessage(
        data.length
          ? `${data.length} live service${data.length === 1 ? "" : "s"} loaded.`
          : "No live services are connected yet.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to load services.",
      );
    } finally {
      setBusy(null);
    }
  };
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token.trim())
      return setMessage("Enter the Live API token before saving a service.");
    setBusy("save");
    const config = {
      name: form.name,
      provider: form.provider,
      providerServiceId: form.providerServiceId,
      healthUrl: form.healthUrl,
      readyUrl: form.readyUrl || undefined,
      probeTimeoutMs: Number(form.probeTimeoutMs),
      checkIntervalMs: Number(form.checkIntervalMs),
      failureThreshold: Number(form.failureThreshold),
      recoveryThreshold: Number(form.recoveryThreshold),
      logLookbackMinutes: Number(form.logLookbackMinutes),
      llm: {
        provider: form.llmProvider,
        baseUrl: form.llmProvider === "ollama" ? form.baseUrl : undefined,
        model: form.model,
        numCtx: Number(form.numCtx),
      },
    };
    try {
      const response = await fetch(`${API}/services`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          config,
          secrets: { providerToken: form.providerToken },
        }),
      });
      if (!response.ok)
        throw new Error(
          await errorMessage(response, "Unable to save service."),
        );
      setForm(defaults);
      setMessage(`Service “${form.name}” saved.`);
      await refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to save service.",
      );
    } finally {
      setBusy(null);
    }
  };
  const test = async (service: Service) => {
    setBusy(`test:${service.id}`);
    try {
      const response = await fetch(
        `${API}/services/${service.id}/test-connection`,
        { headers },
      );
      if (!response.ok)
        throw new Error(
          await errorMessage(response, "Connection test failed."),
        );
      setConnection((await response.json()).status);
      setMessage(`Connection test completed for ${service.name}.`);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Connection test failed.",
      );
    } finally {
      setBusy(null);
    }
  };
  const diagnose = async (service: Service) => {
    const startedAfter = Date.now() - 1000;
    setBusy(`diagnose:${service.id}`);
    setMessage(`Diagnosis is starting for ${service.name}…`);
    try {
      const response = await fetch(`${API}/services/${service.id}/diagnose`, {
        method: "POST",
        headers,
      });
      if (!response.ok)
        throw new Error(
          await errorMessage(response, "Unable to start diagnosis."),
        );
      for (let attempt = 0; attempt < 90; attempt++) {
        await new Promise((resolve) => window.setTimeout(resolve, 1000));
        const data = await loadRuns(service.id);
        const current = data.find(
          (run) => new Date(run.startedAt).getTime() >= startedAfter,
        );
        if (!current) {
          setMessage(`Creating diagnosis for ${service.name}…`);
          continue;
        }
        if (current.status === "RUNNING") {
          setMessage(
            `Investigating ${service.name}… collecting health and ${service.provider} evidence.`,
          );
          continue;
        }
        if (current.status === "COMPLETED") {
          setMessage(
            `Diagnosis completed for ${service.name}. Results are shown below.`,
          );
          return;
        }
        throw new Error(
          "Diagnosis failed. Review the backend terminal for the redacted error.",
        );
      }
      throw new Error(
        "Diagnosis is still running. It will continue in the background; refresh shortly for its result.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to start diagnosis.",
      );
    } finally {
      setBusy(null);
    }
  };
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6 font-mono">
      <header className="mb-8">
        <h1 className="text-2xl font-bold">PagerMind / Live Mode</h1>
        <p className="text-sm text-amber-300 mt-2">
          Read-only diagnosis. Use the most restricted token the platform
          allows.
        </p>
      </header>
      <section className="grid lg:grid-cols-2 gap-6">
        <form
          onSubmit={save}
          className="border border-zinc-800 rounded p-5 space-y-3"
        >
          <h2 className="font-bold">Connect a live service</h2>
          <input
            className="w-full p-2 bg-zinc-900"
            placeholder="Live service name"
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            required
          />
          <select
            className="w-full p-2 bg-zinc-900"
            value={form.provider}
            onChange={(e) => update("provider", e.target.value)}
          >
            <option value="render">Render</option>
            <option value="vercel">Vercel</option>
          </select>
          <input
            className="w-full p-2 bg-zinc-900"
            placeholder="Provider service ID"
            value={form.providerServiceId}
            onChange={(e) => update("providerServiceId", e.target.value)}
            required
          />
          <input
            className="w-full p-2 bg-zinc-900"
            placeholder="Health URL (for TextPull: …/health)"
            value={form.healthUrl}
            onChange={(e) => update("healthUrl", e.target.value)}
            required
          />
          <input
            className="w-full p-2 bg-zinc-900"
            placeholder="Ready URL (optional)"
            value={form.readyUrl}
            onChange={(e) => update("readyUrl", e.target.value)}
          />
          <input
            className="w-full p-2 bg-zinc-900"
            type="password"
            placeholder="Provider token"
            value={form.providerToken}
            onChange={(e) => update("providerToken", e.target.value)}
            required
          />
          <div className="grid grid-cols-2 gap-2">
            {[
              ["probeTimeoutMs", "Probe timeout (ms)"],
              ["checkIntervalMs", "Check interval (ms)"],
              ["failureThreshold", "Failure threshold"],
              ["recoveryThreshold", "Recovery threshold"],
              ["logLookbackMinutes", "Log lookback (min)"],
              ["numCtx", "LLM context"],
            ].map(([key, label]) => (
              <input
                key={key}
                className="p-2 bg-zinc-900"
                type="number"
                aria-label={label}
                value={form[key as keyof typeof form] as number}
                onChange={(e) => update(key, e.target.value)}
              />
            ))}
          </div>
          <select
            className="w-full p-2 bg-zinc-900"
            value={form.llmProvider}
            onChange={(e) => update("llmProvider", e.target.value)}
          >
            <option value="ollama">Ollama</option>
            <option value="gemini">Gemini</option>
          </select>
          <input
            className="w-full p-2 bg-zinc-900"
            placeholder="LLM model"
            value={form.model}
            onChange={(e) => update("model", e.target.value)}
            required
          />
          <button
            className="bg-cyan-700 px-4 py-2 rounded disabled:opacity-50"
            disabled={busy === "save"}
          >
            {busy === "save" ? "Saving…" : "Save service"}
          </button>
        </form>
        <section className="border border-zinc-800 rounded p-5">
          <label className="block text-sm mb-2">Live API token</label>
          <input
            className="w-full p-2 bg-zinc-900 mb-4"
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Configured LIVE_API_TOKEN"
          />
          <button
            className="border border-zinc-600 px-3 py-2 rounded disabled:opacity-50"
            onClick={() => void refresh()}
            disabled={busy === "refresh"}
          >
            {busy === "refresh" ? "Refreshing…" : "Refresh services"}
          </button>
          <p aria-live="polite" className="mt-4 text-sm text-zinc-300">
            {message}
          </p>
          {connection && (
            <div className="mt-4 border border-zinc-700 rounded p-3 text-sm">
              <h3 className="font-bold mb-2">Connection result</h3>
              {Object.entries(connection).map(([key, value]) => (
                <p key={key}>
                  <span className="text-zinc-400">{key}: </span>
                  {value}
                </p>
              ))}
            </div>
          )}
          <div className="mt-5 space-y-3">
            {services.map((service) => {
              const latest = runs[service.id]?.[0];
              const report = latest?.report;
              return (
                <div
                  key={service.id}
                  className="border border-zinc-800 p-3 rounded"
                >
                  <div>
                    <b>{service.name}</b>{" "}
                    <span className="text-zinc-400">
                      {service.provider} · {service.monitorState}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">
                    Service ID: {service.config.providerServiceId}
                  </p>
                  <p className="text-xs text-zinc-500 break-all">
                    Health: {service.config.healthUrl}
                  </p>
                  <div className="mt-2 flex gap-2">
                    <button
                      className="border px-2 py-1 disabled:opacity-50"
                      onClick={() => void diagnose(service)}
                      disabled={busy === `diagnose:${service.id}`}
                    >
                      {busy === `diagnose:${service.id}`
                        ? "Investigating…"
                        : "Diagnose now"}
                    </button>
                    <button
                      className="border px-2 py-1 disabled:opacity-50"
                      onClick={() => void test(service)}
                      disabled={busy === `test:${service.id}`}
                    >
                      {busy === `test:${service.id}`
                        ? "Testing…"
                        : "Test connection"}
                    </button>
                  </div>
                  {latest && (
                    <div className="mt-3 border-t border-zinc-800 pt-3 text-xs">
                      <p>
                        Latest diagnosis: <b>{latest.status}</b> (
                        {latest.trigger})
                      </p>
                      {latest.status === "RUNNING" && (
                        <p className="mt-1 text-amber-300">
                          Collecting read-only evidence…
                        </p>
                      )}
                      {report && (
                        <div className="mt-2 space-y-2">
                          <p>
                            <b>
                              {report.status === "no_incident"
                                ? "Healthy conclusion"
                                : "Investigation conclusion"}
                              :
                            </b>{" "}
                            {report.summary}
                          </p>
                          <p className="text-zinc-400">
                            Evidence collected: {report.timeline.length} sources
                            · Confidence: {report.confidence?.score ?? 0}%
                          </p>
                          {report.hypotheses.map((hypothesis, index) => (
                            <p key={index}>
                              <b>Finding:</b> {hypothesis.claim}
                            </p>
                          ))}
                          {report.evidenceGaps.length > 0 && (
                            <p className="text-amber-300">
                              Unavailable:{" "}
                              {report.evidenceGaps
                                .map((gap) => gap.source)
                                .join(", ")}
                            </p>
                          )}
                          {report.nextSteps.length > 0 && (
                            <p className="text-zinc-300">
                              Next step: {report.nextSteps[0]}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </section>
    </main>
  );
}
