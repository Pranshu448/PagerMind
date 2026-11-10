import crypto from "node:crypto";
const secretNames = /(KEY|SECRET|TOKEN|PASSWORD)/i;
const patterns = [
    [
        /-----BEGIN [^-]*PRIVATE KEY-----[\s\S]*?-----END [^-]*PRIVATE KEY-----/g,
        "[REDACTED_PRIVATE_KEY]",
    ],
    [/(authorization\s*:\s*)(?:bearer\s+)?[^\s,;]+/gi, "$1[REDACTED]"],
    [/\bBearer\s+[A-Za-z0-9._~+\/-]+=*/gi, "Bearer [REDACTED]"],
    [/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, "[REDACTED_JWT]"],
    [/([a-z][a-z0-9+.-]*:\/\/[^:\s/]+:)[^@\s]+@/gi, "$1[REDACTED]@"],
    [/\b(?:sk|rk|pk|AIza)[A-Za-z0-9_-]{12,}\b/g, "[REDACTED_API_KEY]"],
];
export function redact(input) {
    let out = input;
    for (const [pattern, replacement] of patterns)
        out = out.replace(pattern, replacement);
    return out.replace(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)$/gm, (line, name, value) => secretNames.test(name) ? `${name}=[REDACTED]` : line);
}
function key() {
    const raw = process.env.LIVE_SECRET_KEY;
    if (!raw)
        throw new Error("LIVE_SECRET_KEY is required to start Live Mode");
    const decoded = /^[0-9a-f]{64}$/i.test(raw)
        ? Buffer.from(raw, "hex")
        : Buffer.from(raw, "base64");
    if (decoded.length !== 32)
        throw new Error("LIVE_SECRET_KEY must be a 32-byte base64 or 64-char hex key");
    return decoded;
}
export function validateLiveSecretKey() {
    key();
}
export function encryptSecret(value) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
    const encrypted = Buffer.concat([
        cipher.update(JSON.stringify(value), "utf8"),
        cipher.final(),
    ]);
    return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64");
}
export function decryptSecret(value) {
    const data = Buffer.from(value, "base64");
    const decipher = crypto.createDecipheriv("aes-256-gcm", key(), data.subarray(0, 12));
    decipher.setAuthTag(data.subarray(12, 28));
    return JSON.parse(Buffer.concat([
        decipher.update(data.subarray(28)),
        decipher.final(),
    ]).toString("utf8"));
}
export function maskedSecrets() {
    return {
        providerToken: "••••••••",
        gitToken: "••••••••",
        geminiApiKey: "••••••••",
    };
}
//# sourceMappingURL=security.js.map