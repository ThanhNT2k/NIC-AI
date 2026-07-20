const SESSION_COOKIE = "nic_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
const PASSWORD_ITERATIONS = 210_000;

export type SessionUser = { id: string; email: string; fullName: string; organization: string; role: string };

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

async function sha256(value: string) {
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

export async function createSession(userId: string) {
  const token = bytesToBase64(crypto.getRandomValues(new Uint8Array(32)));
  const now = Math.floor(Date.now() / 1000);
  const db = await database();
  await db.prepare("INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)").bind(crypto.randomUUID(), userId, await sha256(token), now + SESSION_TTL_SECONDS, now).run();
  return { token, maxAge: SESSION_TTL_SECONDS };
}

export function sessionCookie(token: string, maxAge: number) {
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${process.env.NODE_ENV === "production" ? "; Secure" : ""}`;
}

export function clearSessionCookie() {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${process.env.NODE_ENV === "production" ? "; Secure" : ""}`;
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
  const row = await db.prepare("SELECT u.id, u.email, u.full_name AS fullName, u.organization, u.role FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ?").bind(await sha256(token), now).first<SessionUser>();
  return row ?? null;
}

export async function deleteCurrentSession(request: Request) {
  const token = cookieValue(request, SESSION_COOKIE);
  if (token) { const db = await database(); await db.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(await sha256(token)).run(); }
}
