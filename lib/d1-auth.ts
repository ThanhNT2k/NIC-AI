const SESSION_COOKIE = "nic_session";
const CSRF_COOKIE = "nic_csrf";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
const PASSWORD_ITERATIONS = 210_000;

export type SessionUser = { id: string; email: string; fullName: string; organization: string; role: string; departmentCode: string | null; capabilities: readonly string[] };
type SessionUserRow = Omit<SessionUser, "capabilities">;

function bytesToBase64(bytes: Uint8Array) {
  let value = "";
  for (const byte of bytes) value += String.fromCharCode(byte);
  return btoa(value);
}

function base64ToBytes(value: string) {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}

async function derivePassword(password: string, salt: Uint8Array, iterations = PASSWORD_ITERATIONS) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, key, 256);
  return new Uint8Array(bits);
}

export async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return bytesToBase64(new Uint8Array(digest));
}

function constantTimeEqual(left: Uint8Array, right: Uint8Array) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left[index] ^ right[index];
  return difference === 0;
}

export async function database() {
  const { env } = await import("cloudflare:workers");
  if (!env.DB) throw new Error("D1 binding DB chưa được cấu hình.");
  return env.DB;
}

export async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derivePassword(password, salt);
  return { hash: bytesToBase64(hash), salt: bytesToBase64(salt), iterations: PASSWORD_ITERATIONS };
}

export async function verifyPassword(password: string, expectedHash: string, salt: string, iterations: number) {
  const actual = await derivePassword(password, base64ToBytes(salt), iterations);
  return constantTimeEqual(actual, base64ToBytes(expectedHash));
}

export async function createSession(userId: string, options: { authMethod?: "local" | "federated"; mfaVerified?: boolean } = {}) {
  const token = bytesToBase64(crypto.getRandomValues(new Uint8Array(32)));
  const csrfToken = bytesToBase64(crypto.getRandomValues(new Uint8Array(24)));
  const now = Math.floor(Date.now() / 1000);
  const db = await database();
  await db.prepare("INSERT INTO sessions (id,user_id,token_hash,csrf_hash,auth_method,mfa_verified,expires_at,created_at) VALUES (?,?,?,?,?,?,?,?)").bind(crypto.randomUUID(),userId,await sha256(token),await sha256(csrfToken),options.authMethod??"local",options.mfaVerified?1:0,now+SESSION_TTL_SECONDS,now).run();
  return { token, csrfToken, maxAge: SESSION_TTL_SECONDS };
}

export function sessionCookie(token: string, maxAge: number) {
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${process.env.NODE_ENV === "production" ? "; Secure" : ""}`;
}

export function csrfCookie(token: string, maxAge: number) {
  return `${CSRF_COOKIE}=${encodeURIComponent(token)}; Path=/; SameSite=Strict; Max-Age=${maxAge}${process.env.NODE_ENV === "production" ? "; Secure" : ""}`;
}

export function sessionHeaders(session: { token: string; csrfToken: string; maxAge: number }) {
  const headers = new Headers({ "Content-Type": "application/json" });
  headers.append("Set-Cookie", sessionCookie(session.token, session.maxAge));
  headers.append("Set-Cookie", csrfCookie(session.csrfToken, session.maxAge));
  return headers;
}

export function clearedSessionHeaders() {
  const headers = new Headers({ "Content-Type": "application/json" });
  headers.append("Set-Cookie", clearSessionCookie());
  headers.append("Set-Cookie", clearCsrfCookie());
  return headers;
}

export function clearSessionCookie() {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${process.env.NODE_ENV === "production" ? "; Secure" : ""}`;
}

export function clearCsrfCookie() {
  return `${CSRF_COOKIE}=; Path=/; SameSite=Strict; Max-Age=0${process.env.NODE_ENV === "production" ? "; Secure" : ""}`;
}

function cookieValue(request: Request, name: string) {
  const cookie = request.headers.get("cookie") ?? "";
  for (const part of cookie.split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return decodeURIComponent(value.join("="));
  }
  return null;
}

export async function currentUser(request: Request): Promise<SessionUser | null> {
  const token = cookieValue(request, SESSION_COOKIE);
  if (!token) return null;
  const now = Math.floor(Date.now() / 1000);
  const db = await database();
  const row = await db.prepare("SELECT u.id, u.email, u.full_name AS fullName, COALESCE(m.organization, u.organization) AS organization, COALESCE(m.role, u.role) AS role, d.code AS departmentCode FROM sessions s JOIN users u ON u.id = s.user_id LEFT JOIN organization_memberships m ON m.user_id = u.id AND m.status = 'active' LEFT JOIN departments d ON d.id = m.department_id WHERE s.token_hash = ? AND s.expires_at > ? AND u.account_status='active'").bind(await sha256(token), now).first<SessionUserRow>();
  return row ? { ...row, capabilities: capabilitiesFor(row.role) } : null;
}

export async function deleteCurrentSession(request: Request) {
  const token = cookieValue(request, SESSION_COOKIE);
  if (token) { const db = await database(); await db.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(await sha256(token)).run(); }
}

function normalizedOrigin(value: string | null | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value.trim());
    if (!new Set(["http:", "https:"]).has(url.protocol) || url.username || url.password || url.pathname !== "/" || url.search || url.hash) return null;
    return url.origin;
  } catch {
    return null;
  }
}

function forwardedOrigin(request: Request) {
  const forwarded = request.headers.get("forwarded")?.split(",")[0];
  if (forwarded) {
    const values = new Map(forwarded.split(";").map((part) => {
      const [key, ...rest] = part.trim().split("=");
      return [key.toLowerCase(), rest.join("=").replace(/^"|"$/g, "")];
    }));
    const proto = values.get("proto");
    const host = values.get("host");
    const origin = normalizedOrigin(proto && host ? `${proto}://${host}` : null);
    if (origin) return origin;
  }

  const proto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const host = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  return normalizedOrigin(proto && host ? `${proto}://${host}` : null);
}

export function validRequestOrigin(request: Request) {
  const origin = normalizedOrigin(request.headers.get("origin"));
  if (!origin) return false;

  const allowedOrigins = [
    normalizedOrigin(process.env.APP_ORIGIN),
    new URL(request.url).origin,
    forwardedOrigin(request),
  ].filter((value): value is string => Boolean(value));

  return allowedOrigins.includes(origin);
}

export async function requireCsrf(request: Request) {
  if (!validRequestOrigin(request)) return null;
  const sessionToken = cookieValue(request, SESSION_COOKIE);
  const csrfToken = cookieValue(request, CSRF_COOKIE);
  const headerToken = request.headers.get("x-csrf-token");
  if (!sessionToken || !csrfToken || !headerToken || csrfToken !== headerToken) return null;
  const now = Math.floor(Date.now() / 1000); const db = await database();
  const row = await db.prepare("SELECT u.id, u.email, u.full_name AS fullName, COALESCE(m.organization, u.organization) AS organization, COALESCE(m.role, u.role) AS role, d.code AS departmentCode FROM sessions s JOIN users u ON u.id = s.user_id LEFT JOIN organization_memberships m ON m.user_id = u.id AND m.status = 'active' LEFT JOIN departments d ON d.id = m.department_id WHERE s.token_hash = ? AND s.csrf_hash = ? AND s.expires_at > ? AND u.account_status='active'").bind(await sha256(sessionToken), await sha256(csrfToken), now).first<SessionUserRow>();
  return row ? { ...row, capabilities: capabilitiesFor(row.role) } : null;
}

export async function enforceRateLimit(request: Request, scope: string, identity: string, limit: number, windowSeconds: number) {
  const ip = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const bucketKey = await sha256(`${scope}:${ip}:${identity.toLowerCase()}`); const now = Math.floor(Date.now() / 1000); const db = await database();
  const row = await db.prepare("INSERT INTO rate_limits (bucket_key, window_start, count, expires_at) VALUES (?, ?, 1, ?) ON CONFLICT(bucket_key) DO UPDATE SET count = CASE WHEN window_start <= ? THEN 1 ELSE count + 1 END, window_start = CASE WHEN window_start <= ? THEN ? ELSE window_start END, expires_at = ? RETURNING count").bind(bucketKey, now, now + windowSeconds * 2, now - windowSeconds, now - windowSeconds, now, now + windowSeconds * 2).first<{ count: number }>();
  return (row?.count ?? limit + 1) <= limit;
}
import { capabilitiesFor } from "@/lib/access-control";
