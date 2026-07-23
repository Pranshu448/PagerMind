// backend/src/monitor.ts


const SANDBOX_URL = 'http://localhost:8080/health';
const WEBHOOK_URL = 'http://localhost:3000/api/alerts';
const SERVICE_NAME = 'checkout-api';

console.log(`🔍 Datadog/Prometheus Simulator started...`);
console.log(`📡 Monitoring ${SANDBOX_URL} every 2 seconds.\n`);

setInterval(async () => {
    try {
        const response = await fetch(SANDBOX_URL);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        process.stdout.write('🟢 '); // Visual heartbeat for healthy state
        
    } catch (error: any) {
        console.log(`\n\n🚨 [ALERT] CRASH DETECTED: ${error.message}`);
        console.log(`🚀 Firing webhook to PagerMind AI Orchestrator...`);
        
        try {
            // Trigger the AI Agent automatically
            await fetch(WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ serviceName: SERVICE_NAME })
            });
            console.log(`✅ Webhook delivered successfully. Backing off for 10 seconds to allow investigation...`);
        } catch (webhookError) {
            console.error(`❌ Failed to reach PagerMind backend:`, webhookError);
        }
        
    }
}, 2000); // Ping every 2 seconds