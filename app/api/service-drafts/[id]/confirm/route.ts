import { database, enforceRateLimit, requireCsrf } from "@/lib/d1-auth";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireCsrf(request); if (!user) return Response.json({ error: "CSRF_INVALID" }, { status: 403 });
  if (!await enforceRateLimit(request, "draft.confirm", user.id, 30, 3600)) return Response.json({ error: "RATE_LIMITED" }, { status: 429 });
  const { id } = await context.params; const body = await request.json().catch(() => null) as { version?: number } | null;
  if (!Number.isInteger(body?.version)) return Response.json({ error: "VALIDATION_FAILED" }, { status: 400 });
  const db = await database(); const now = Math.floor(Date.now() / 1000); const auditId = crypto.randomUUID();
  const results = await db.batch([
    db.prepare("UPDATE service_drafts SET confirmed_version = version, updated_at = ? WHERE id = ? AND owner_id = ? AND status = 'draft' AND version = ?").bind(now, id, user.id, body?.version),
    db.prepare("INSERT INTO audit_logs (id, actor_id, action, entity_type, entity_id, metadata, created_at) SELECT ?, ?, 'draft.confirmed', 'service_draft', id, json_object('version', version), ? FROM service_drafts WHERE id = ? AND owner_id = ? AND confirmed_version = version").bind(auditId, user.id, now, id, user.id),
  ]);
  if ((results[0].meta.changes ?? 0) !== 1) return Response.json({ error: "VERSION_CONFLICT" }, { status: 409 });
  return Response.json({ draft: { id, version: body?.version, confirmedVersion: body?.version } });
}
