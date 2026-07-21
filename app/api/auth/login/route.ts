import { createSession, database, enforceRateLimit, sessionHeaders, validRequestOrigin, verifyPassword } from "@/lib/d1-auth";

type UserRow = { id: string; email: string; fullName: string; organization: string; role: string; passwordHash: string; passwordSalt: string; passwordIterations: number; failedAttempts: number; lockedUntil: number | null; accountStatus: string };
export async function POST(request: Request) {
  if (!validRequestOrigin(request)) return Response.json({ error: "INVALID_ORIGIN" }, { status: 403 });
  const body = await request.json().catch(() => null) as { email?: string; password?: string } | null;
  const email = body?.email?.trim().toLowerCase(); const password = body?.password ?? "";
  if (!email || !password) return Response.json({ error: "Vui lòng nhập email và mật khẩu." }, { status: 400 });
  if (!await enforceRateLimit(request, "auth.login", email, 8, 900)) return Response.json({ error: "Quá nhiều lần thử. Vui lòng quay lại sau." }, { status: 429 });
  const db = await database();
  const user = await db.prepare("SELECT id,email,full_name AS fullName,organization,role,password_hash AS passwordHash,password_salt AS passwordSalt,password_iterations AS passwordIterations,failed_attempts AS failedAttempts,locked_until AS lockedUntil,account_status AS accountStatus FROM users WHERE email = ?").bind(email).first<UserRow>();
  const now = Math.floor(Date.now() / 1000);
  if (user?.accountStatus && user.accountStatus !== "active") return Response.json({ error: "Tài khoản không còn hiệu lực." }, { status: 403 });
  if (process.env.ENTERPRISE_AUTH_REQUIRED === "1" && user && !["customer_member","customer_admin","tenant_member","tenant_admin"].includes(user.role)) return Response.json({ error: "ENTERPRISE_LOGIN_REQUIRED", enterpriseLogin: "/api/auth/enterprise/start" }, { status: 403 });
  if (user?.lockedUntil && user.lockedUntil > now) return Response.json({ error: "Tài khoản tạm khóa. Vui lòng thử lại sau." }, { status: 429 });
  const valid = user ? await verifyPassword(password, user.passwordHash, user.passwordSalt, user.passwordIterations) : false;
  if (!user || !valid) { if (user) { const attempts = user.failedAttempts + 1; await db.prepare("UPDATE users SET failed_attempts = ?, locked_until = ? WHERE id = ?").bind(attempts >= 5 ? 0 : attempts, attempts >= 5 ? now + 900 : null, user.id).run(); } return Response.json({ error: "Email hoặc mật khẩu không đúng." }, { status: 401 }); }
  await db.prepare("UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = ?").bind(user.id).run();
  const session = await createSession(user.id);
  return new Response(JSON.stringify({ user: { id: user.id, email: user.email, fullName: user.fullName, organization: user.organization, role: user.role } }), { headers: sessionHeaders(session) });
}
