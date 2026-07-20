import { createSession, database, hashPassword, sessionCookie } from "@/lib/d1-auth";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { email?: string; password?: string; fullName?: string; organization?: string } | null;
  const email = body?.email?.trim().toLowerCase();
  const fullName = body?.fullName?.trim();
  const organization = body?.organization?.trim();
  const password = body?.password ?? "";
  if (!email || !/^\S+@\S+\.\S+$/.test(email) || !fullName || !organization || password.length < 10) return Response.json({ error: "Vui lòng nhập đủ thông tin. Mật khẩu cần ít nhất 10 ký tự." }, { status: 400 });
  const db = await database();
  const exists = await db.prepare("SELECT id FROM users WHERE email = ?").bind(email).first();
  if (exists) return Response.json({ error: "Email này đã được sử dụng." }, { status: 409 });
  const passwordData = await hashPassword(password);
  const id = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);
  await db.prepare("INSERT INTO users (id, email, full_name, organization, role, password_hash, password_salt, password_iterations, failed_attempts, created_at) VALUES (?, ?, ?, ?, 'tenant_member', ?, ?, ?, 0, ?)").bind(id, email, fullName, organization, passwordData.hash, passwordData.salt, passwordData.iterations, now).run();
  const session = await createSession(id);
  return Response.json({ user: { id, email, fullName, organization, role: "tenant_member" } }, { status: 201, headers: { "Set-Cookie": sessionCookie(session.token, session.maxAge) } });
}
