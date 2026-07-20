import { currentUser, database } from "@/lib/d1-auth";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await currentUser(request); if (!user) return Response.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  const { id } = await context.params;
  const body = await request.json().catch(() => null) as { title?: string; details?: string; expectedVersion?: number } | null;
  const title = body?.title?.trim() ?? ""; const details = body?.details?.trim() ?? ""; const expectedVersion = body?.expectedVersion;
  if (title.length < 3 || title.length > 120 || details.length < 5 || details.length > 2000 || !Number.isInteger(expectedVersion)) return Response.json({ error: "VALIDATION_FAILED" }, { status: 400 });
  const db = await database(); const now = Math.floor(Date.now() / 1000);
  const result = await db.prepare("UPDATE service_drafts SET title = ?, details = ?, version = version + 1, confirmed_version = NULL, updated_at = ? WHERE id = ? AND owner_id = ? AND status = 'draft' AND version = ? RETURNING id, version").bind(title, details, now, id, user.id, expectedVersion).first<{ id: string; version: number }>();
  if (!result) return Response.json({ error: "VERSION_CONFLICT" }, { status: 409 });
  await db.prepare("INSERT INTO audit_logs (id, actor_id, action, entity_type, entity_id, metadata, created_at) VALUES (?, ?, 'draft.updated', 'service_draft', ?, ?, ?)").bind(crypto.randomUUID(), user.id, id, JSON.stringify({ version: result.version }), now).run();
  return Response.json({ draft: { id, version: result.version, confirmedVersion: null } });
}
