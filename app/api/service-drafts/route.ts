import { currentUser, database, enforceRateLimit, requireCsrf } from "@/lib/d1-auth";

const serviceTypes = new Set(["space_booking", "support", "event_registration", "access_card"]);
export async function GET(request: Request) {
  const user = await currentUser(request); if (!user) return Response.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  const db = await database();
  const result = await db.prepare("SELECT id, service_type AS serviceType, title, details, status, version, confirmed_version AS confirmedVersion, created_at AS createdAt, updated_at AS updatedAt FROM service_drafts WHERE owner_id = ? ORDER BY updated_at DESC LIMIT 20").bind(user.id).all();
  return Response.json({ drafts: result.results });
}
export async function POST(request: Request) {
  const user = await requireCsrf(request); if (!user) return Response.json({ error: "CSRF_INVALID" }, { status: 403 });
  if (!await enforceRateLimit(request, "draft.create", user.id, 30, 3600)) return Response.json({ error: "RATE_LIMITED" }, { status: 429 });
  const body = await request.json().catch(() => null) as { serviceType?: string; title?: string; details?: string } | null;
  const serviceType = body?.serviceType ?? ""; const title = body?.title?.trim() ?? ""; const details = body?.details?.trim() ?? "";
  if (!serviceTypes.has(serviceType) || title.length < 3 || title.length > 120 || details.length < 5 || details.length > 2000) return Response.json({ error: "Thông tin bản nháp chưa hợp lệ." }, { status: 400 });
  const id = crypto.randomUUID(); const now = Math.floor(Date.now() / 1000);
  const db = await database();
  await db.prepare("INSERT INTO service_drafts (id, owner_id, service_type, title, details, status, version, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'draft', 1, ?, ?)").bind(id, user.id, serviceType, title, details, now, now).run();
  return Response.json({ draft: { id, serviceType, title, details, status: "draft", version: 1, confirmedVersion: null, createdAt: now, updatedAt: now } }, { status: 201 });
}
