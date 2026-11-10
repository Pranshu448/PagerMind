// backend/src/monitor.ts
const SANDBOX_URL = 'http://localhost:8080/health';
const WEBHOOK_URL = 'http://localhost:3000/api/alerts';
const SERVICE_NAME = 'checkout-api';
// An outage is an edge, not every failed health probe. Without this state the
// monitor posts a new alert every two seconds, so deleting/resolving an
// incident while the service is still down immediately creates another one.
let outageActive = false;
let alertDeliveredForOutage = false;
let probeInFlight = false;
console.log(`🔍 Datadog/Prometheus Simulator started...`);
console.log(`📡 Monitoring ${SANDBOX_URL} every 2 seconds.\n`);
async function pollHealth() {
    // Do not overlap probes when the sandbox or backend is slow.
    if (probeInFlight)
        return;
    probeInFlight = true;
    try {
        const response = await fetch(SANDBOX_URL);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        if (outageActive) {
            console.log('\n✅ [RECOVERY] Service is healthy again. A future outage can create a new alert.');
        }
        outageActive = false;
        alertDeliveredForOutage = false;
        process.stdout.write('🟢 '); // Visual heartbeat for healthy state
    }
    catch (error) {
        if (!outageActive) {
            outageActive = true;
            console.log(`\n\n🚨 [ALERT] CRASH DETECTED: ${error.message}`);
        }
        // The existing incident remains the single record for this continuous
        // outage—even if an operator resolves or deletes it. Another alert is
        // allowed only after health has recovered and subsequently fails again.
        if (alertDeliveredForOutage) {
            process.stdout.write('🔴 ');
            return;
        }
        console.log(`🚀 Firing webhook to PagerMind AI Orchestrator...`);
        try {
            // Trigger the AI Agent automatically
            const webhookResponse = await fetch(WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ serviceName: SERVICE_NAME })
            });
            if (!webhookResponse.ok) {
                throw new Error(`Webhook returned HTTP ${webhookResponse.status}`);
            }
            alertDeliveredForOutage = true;
            console.log(`✅ Webhook delivered successfully. This outage will not alert again until the service recovers.`);
        }
        catch (webhookError) {
            console.error(`❌ Failed to reach PagerMind backend:`, webhookError);
        }
    }
    finally {
        probeInFlight = false;
    }
}
void pollHealth();
setInterval(() => void pollHealth(), 2000); // Ping every 2 seconds
export {};
//# sourceMappingURL=monitor.js.map