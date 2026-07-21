import { currentUser, database, requireCsrf } from "@/lib/d1-auth";

export async function GET(request: Request) {
  const user = await currentUser(request);
  if (!user) return Response.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  const db = await database();
  const rows = await db.prepare("SELECT id,type,entity_type AS entityType,entity_id AS entityId,title,body,status,created_at AS createdAt FROM notifications WHERE recipient_id=? ORDER BY created_at DESC LIMIT 20").bind(user.id).all();
  return Response.json({ notifications: rows.results });
}

export async function POST(request: Request) {
  const user = await requireCsrf(request);
  if (!user) return Response.json({ error: "CSRF_INVALID" }, { status: 403 });
  const body = await request.json().catch(() => null) as { action?: unknown } | null;
  if (body?.action !== "mark_all_read") return Response.json({ error: "ACTION_INVALID" }, { status: 400 });
  const db = await database();
  const now = Math.floor(Date.now() / 1000);
  await db.batch([
    db.prepare("UPDATE notifications SET status='read',delivered_at=COALESCE(delivered_at,?) WHERE recipient_id=? AND status<>'read'").bind(now,user.id),
    db.prepare("INSERT INTO audit_logs (id,actor_id,action,entity_type,entity_id,metadata,created_at) VALUES (?,?,?,?,?,?,?)").bind(crypto.randomUUID(),user.id,"notification.mark_all_read","user",user.id,JSON.stringify({ scope:"own" }),now),
  ]);
  return Response.json({ ok: true });
}
