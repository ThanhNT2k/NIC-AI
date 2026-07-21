const SENSITIVE_KEY = /authorization|cookie|password|secret|token|phone|email|payload|prompt/i;

export function safeReturnTo(value: string | null | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return "/portal";
  return value.slice(0, 300);
}

export function requiresEnterpriseMfa(role: string, configured = false) {
  return configured || ["system_admin", "finance_manager", "facility_manager", "event_manager"].includes(role);
}

export function hasMfaClaim(amr: readonly string[] | undefined) {
  return Boolean(amr?.some((method) => ["mfa", "otp", "hwk", "fido", "webauthn"].includes(method.toLowerCase())));
}

export function redactForLog(value: unknown, depth = 0): unknown {
  if (depth > 4) return "[TRUNCATED]";
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => redactForLog(item, depth + 1));
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value as Record<string, unknown>).slice(0, 30).map(([key, item]) => [key, SENSITIVE_KEY.test(key) ? "[REDACTED]" : redactForLog(item, depth + 1)]));
  if (typeof value === "string") return value.slice(0, 300);
  return value;
}

export function retentionCutoff(nowSeconds: number, retentionDays: number) {
  if (!Number.isSafeInteger(nowSeconds) || nowSeconds < 1 || !Number.isSafeInteger(retentionDays) || retentionDays < 1 || retentionDays > 3650) throw new Error("RETENTION_POLICY_INVALID");
  return nowSeconds - retentionDays * 86_400;
}
