import { database, enforceRateLimit, requireCsrf } from "@/lib/d1-auth";

type ExistingRequest = { id: string; status: string };
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireCsrf(request); if (!user) return Response.json({ error: "CSRF_INVALID" }, { status: 403 });
  if (!await enforceRateLimit(request, "request.submit", user.id, 20, 3600)) return Response.json({ error: "RATE_LIMITED" }, { status: 429 });
  const idempotencyKey = request.headers.get("idempotency-key")?.trim();
  if (!idempotencyKey || idempotencyKey.length < 16 || idempotencyKey.length > 100) return Response.json({ error: "IDEMPOTENCY_KEY_REQUIRED" }, { status: 400 });
  const { id: draftId } = await context.params; const db = await database();
  const existing = await db.prepare("SELECT id, status FROM service_requests WHERE owner_id = ? AND idempotency_key = ?").bind(user.id, idempotencyKey).first<ExistingRequest>();
  if (existing) return Response.json({ request: existing, replayed: true });
  const requestId = crypto.randomUUID(); const auditId = crypto.randomUUID(); const now = Math.floor(Date.now() / 1000);
  try {
    const results = await db.batch([
      db.prepare("INSERT INTO service_requests (id, draft_id, owner_id, organization, service_type, title, details, status, idempotency_key, created_at) SELECT ?, d.id, d.owner_id, u.organization, d.service_type, d.title, d.details, 'submitted', ?, ? FROM service_drafts d JOIN users u ON u.id = d.owner_id WHERE d.id = ? AND d.owner_id = ? AND d.status = 'draft' AND d.confirmed_version = d.version").bind(requestId, idempotencyKey, now, draftId, user.id),
      db.prepare("UPDATE service_drafts SET status = 'submitted', updated_at = ? WHERE id = ? AND owner_id = ? AND status = 'draft' AND confirmed_version = version AND EXISTS (SELECT 1 FROM service_requests WHERE id = ? AND draft_id = service_drafts.id)").bind(now, draftId, user.id, requestId),
      db.prepare("INSERT INTO audit_logs (id, actor_id, action, entity_type, entity_id, metadata, created_at) SELECT ?, ?, 'request.submitted', 'service_request', id, json_object('draftId', draft_id), ? FROM service_requests WHERE id = ? AND owner_id = ?").bind(auditId, user.id, now, requestId, user.id),
    ]);
    if ((results[0].meta.changes ?? 0) !== 1 || (results[1].meta.changes ?? 0) !== 1) return Response.json({ error: "CONFIRMATION_REQUIRED" }, { status: 409 });
  } catch {
    const replay = await db.prepare("SELECT id, status FROM service_requests WHERE owner_id = ? AND idempotency_key = ?").bind(user.id, idempotencyKey).first<ExistingRequest>();
    if (replay) return Response.json({ request: replay, replayed: true });
    return Response.json({ error: "SUBMIT_FAILED" }, { status: 500 });
  }
  return Response.json({ request: { id: requestId, status: "submitted" }, replayed: false }, { status: 201 });
}
