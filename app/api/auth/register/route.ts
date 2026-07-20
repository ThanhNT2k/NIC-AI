import { createSession, database, enforceRateLimit, hashPassword, sessionHeaders, validRequestOrigin } from "@/lib/d1-auth";

export async function POST(request: Request) {
  if (!validRequestOrigin(request)) return Response.json({ error: "INVALID_ORIGIN" }, { status: 403 });
  if (!await enforceRateLimit(request, "auth.register", "public", 5, 3600)) return Response.json({ error: "Quá nhiều tài khoản được tạo. Vui lòng quay lại sau." }, { status: 429 });
  const body = await request.json().catch(() => null) as { email?: string; password?: string; fullName?: string; organization?: string } | null;
  const email = body?.email?.trim().toLowerCase(); const fullName = body?.fullName?.trim(); const organization = body?.organization?.trim(); const password = body?.password ?? "";
  if (!email || !/^\S+@\S+\.\S+$/.test(email) || !fullName || !organization || password.length < 10) return Response.json({ error: "Vui lòng nhập đủ thông tin. Mật khẩu cần ít nhất 10 ký tự." }, { status: 400 });
  const db = await database(); const exists = await db.prepare("SELECT id FROM users WHERE email = ?").bind(email).first();
  if (exists) return Response.json({ error: "Email này đã được sử dụng." }, { status: 409 });
  const passwordData = await hashPassword(password); const id = crypto.randomUUID(); const now = Math.floor(Date.now() / 1000);
  await db.prepare("INSERT INTO users (id, email, full_name, organization, role, password_hash, password_salt, password_iterations, failed_attempts, created_at) VALUES (?, ?, ?, ?, 'tenant_member', ?, ?, ?, 0, ?)").bind(id, email, fullName, organization, passwordData.hash, passwordData.salt, passwordData.iterations, now).run();
  const session = await createSession(id);
  return new Response(JSON.stringify({ user: { id, email, fullName, organization, role: "tenant_member" } }), { status: 201, headers: sessionHeaders(session) });
}
