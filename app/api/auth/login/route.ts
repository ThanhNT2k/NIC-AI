import { createSession, database, sessionCookie, verifyPassword } from "@/lib/d1-auth";

type UserRow = { id: string; email: string; fullName: string; organization: string; role: string; passwordHash: string; passwordSalt: string; passwordIterations: number; failedAttempts: number; lockedUntil: number | null };
export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { email?: string; password?: string } | null;
  const email = body?.email?.trim().toLowerCase();
  const password = body?.password ?? "";
  if (!email || !password) return Response.json({ error: "Vui lòng nhập email và mật khẩu." }, { status: 400 });
  const db = await database();
  const user = await db.prepare("SELECT id, email, full_name AS fullName, organization, role, password_hash AS passwordHash, password_salt AS passwordSalt, password_iterations AS passwordIterations, failed_attempts AS failedAttempts, locked_until AS lockedUntil FROM users WHERE email = ?").bind(email).first<UserRow>();
  const now = Math.floor(Date.now() / 1000);
  if (user?.lockedUntil && user.lockedUntil > now) return Response.json({ error: "Tài khoản tạm khóa. Vui lòng thử lại sau." }, { status: 429 });
  const valid = user ? await verifyPassword(password, user.passwordHash, user.passwordSalt, user.passwordIterations) : false;
  if (!user || !valid) {
    if (user) { const attempts = user.failedAttempts + 1; await db.prepare("UPDATE users SET failed_attempts = ?, locked_until = ? WHERE id = ?").bind(attempts >= 5 ? 0 : attempts, attempts >= 5 ? now + 900 : null, user.id).run(); }
    return Response.json({ error: "Email hoặc mật khẩu không đúng." }, { status: 401 });
  }
  await db.prepare("UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = ?").bind(user.id).run();
  const session = await createSession(user.id);
  return Response.json({ user: { id: user.id, email: user.email, fullName: user.fullName, organization: user.organization, role: user.role } }, { headers: { "Set-Cookie": sessionCookie(session.token, session.maxAge) } });
}
