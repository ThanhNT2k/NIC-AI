import { clearedSessionHeaders, database, requireCsrf } from "@/lib/d1-auth";

export async function POST(request: Request) {
  const user = await requireCsrf(request);
  if (!user) return Response.json({ error: "CSRF_INVALID" }, { status: 403 });
  const db = await database(); const now = Math.floor(Date.now() / 1000);
  await db.batch([
    db.prepare("DELETE FROM sessions WHERE user_id = ?").bind(user.id),
    db.prepare("INSERT INTO audit_logs (id, actor_id, action, entity_type, entity_id, metadata, created_at) VALUES (?, ?, 'session.revoked_all', 'user', ?, '{}', ?)").bind(crypto.randomUUID(), user.id, user.id, now),
  ]);
  return new Response(JSON.stringify({ ok: true }), { headers: clearedSessionHeaders() });
}
