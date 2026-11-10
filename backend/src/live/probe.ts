import type { ProbeResult } from "./types.js";

export async function probeUrl(
  url: string,
  timeoutMs: number,
): Promise<ProbeResult> {
  const started = performance.now();
  let redirects = 0;
  let current = url;
  try {
    for (; redirects <= 5; redirects++) {
      const response = await fetch(current, {
        signal: AbortSignal.timeout(timeoutMs),
        redirect: "manual",
      });
      if (
        response.status >= 300 &&
        response.status < 400 &&
        response.headers.get("location")
      ) {
        current = new URL(
          response.headers.get("location")!,
          current,
        ).toString();
        continue;
      }
      const base = {
        ok: response.ok,
        status: response.status,
        latencyMs: Math.round(performance.now() - started),
        redirectCount: redirects,
        observedAt: new Date().toISOString(),
      };
      return response.ok ? base : { ...base, errorClass: "http" as const };
    }
    return {
      ok: false,
      latencyMs: Math.round(performance.now() - started),
      errorClass: "http",
      redirectCount: redirects,
      observedAt: new Date().toISOString(),
    };
  } catch (error) {
    const message = String(error).toLowerCase();
    const errorClass =
      error instanceof DOMException && error.name === "TimeoutError"
        ? "timeout"
        : message.includes("dns") || message.includes("enotfound")
          ? "dns"
          : message.includes("tls") || message.includes("certificate")
            ? "tls"
            : message.includes("refused") || message.includes("econnrefused")
              ? "refused"
              : "http";
    return {
      ok: false,
      latencyMs: Math.round(performance.now() - started),
      errorClass,
      redirectCount: redirects,
      observedAt: new Date().toISOString(),
    };
  }
}
