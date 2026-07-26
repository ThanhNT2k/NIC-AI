const SENSITIVE_KEY = /authorization|cookie|password|secret|token|phone|email|payload|prompt/i;
export function safeReturnTo(value) {
    if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\"))
        return "/portal";
    return value.slice(0, 300);
}
export function requiresEnterpriseMfa(role, configured = false) {
    return configured || ["system_admin", "finance_manager", "facility_manager", "event_manager"].includes(role);
}
export function hasMfaClaim(amr) {
    return Boolean(amr?.some((method) => ["mfa", "otp", "hwk", "fido", "webauthn"].includes(method.toLowerCase())));
}
export function redactForLog(value, depth = 0) {
    if (depth > 4)
        return "[TRUNCATED]";
    if (Array.isArray(value))
        return value.slice(0, 20).map((item) => redactForLog(item, depth + 1));
    if (value && typeof value === "object")
        return Object.fromEntries(Object.entries(value).slice(0, 30).map(([key, item]) => [key, SENSITIVE_KEY.test(key) ? "[REDACTED]" : redactForLog(item, depth + 1)]));
    if (typeof value === "string")
        return value.slice(0, 300);
    return value;
}
export function retentionCutoff(nowSeconds, retentionDays) {
    if (!Number.isSafeInteger(nowSeconds) || nowSeconds < 1 || !Number.isSafeInteger(retentionDays) || retentionDays < 1 || retentionDays > 3650)
        throw new Error("RETENTION_POLICY_INVALID");
    return nowSeconds - retentionDays * 86_400;
}
