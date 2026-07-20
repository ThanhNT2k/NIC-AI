import { can } from "@/lib/access-control";
import { currentUser, database, enforceRateLimit, requireCsrf } from "@/lib/d1-auth";
import { validBookingWindow } from "@/lib/operations-policy";

export async function GET(request: Request) {
  const user = await currentUser(request);
  if (!user) return Response.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  const db = await database();
  const spaces = await db.prepare("SELECT id, code, name, location, capacity, equipment FROM spaces WHERE status = 'active' ORDER BY capacity").all();
  const bookings = can(user.role, "booking:manage")
    ? await db.prepare("SELECT b.id,b.title,b.starts_at AS startsAt,b.ends_at AS endsAt,b.attendee_count AS attendeeCount,b.status,b.space_id AS spaceId,s.name AS spaceName,u.full_name AS requesterName FROM bookings b JOIN spaces s ON s.id=b.space_id JOIN users u ON u.id=b.requester_id WHERE b.status='confirmed' ORDER BY b.starts_at LIMIT 100").all()
    : await db.prepare("SELECT b.id,b.title,b.starts_at AS startsAt,b.ends_at AS endsAt,b.attendee_count AS attendeeCount,b.status,b.space_id AS spaceId,s.name AS spaceName FROM bookings b JOIN spaces s ON s.id=b.space_id WHERE b.requester_id=? AND b.organization=? ORDER BY b.starts_at DESC LIMIT 50").bind(user.id,user.organization).all();
  return Response.json({ spaces: spaces.results, bookings: bookings.results });
}

export async function POST(request: Request) {
  const user = await requireCsrf(request);
  if (!user) return Response.json({ error: "CSRF_INVALID" }, { status: 403 });
  if (!can(user.role, "booking:create") && !can(user.role, "booking:manage")) return Response.json({ error: "FORBIDDEN" }, { status: 403 });
  if (!await enforceRateLimit(request, "booking.create", user.id, 30, 3600)) return Response.json({ error: "RATE_LIMITED" }, { status: 429 });
  const body = await request.json().catch(() => null) as { spaceId?: unknown; title?: unknown; attendeeCount?: unknown; startsAt?: unknown; endsAt?: unknown; notes?: unknown } | null;
  const spaceId = typeof body?.spaceId === "string" ? body.spaceId : "";
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const attendeeCount = Number(body?.attendeeCount);
  const startsAt = Number(body?.startsAt); const endsAt = Number(body?.endsAt);
  const notes = typeof body?.notes === "string" ? body.notes.trim() : "";
  if (!spaceId || title.length < 3 || title.length > 120 || !Number.isInteger(attendeeCount) || attendeeCount < 1 || notes.length > 1000 || !validBookingWindow(startsAt, endsAt)) return Response.json({ error: "BOOKING_INVALID" }, { status: 400 });
  const db = await database(); const id = crypto.randomUUID(); const now = Math.floor(Date.now() / 1000);
  const result = await db.prepare("INSERT INTO bookings (id,requester_id,organization,space_id,title,attendee_count,starts_at,ends_at,status,notes,created_at,updated_at) SELECT ?,?,?,?,?,?,?,?,'confirmed',?,?,? FROM spaces s WHERE s.id=? AND s.status='active' AND s.capacity>=? AND NOT EXISTS (SELECT 1 FROM bookings b WHERE b.space_id=s.id AND b.status='confirmed' AND b.starts_at < ? AND b.ends_at > ?)").bind(id,user.id,user.organization,spaceId,title,attendeeCount,startsAt,endsAt,notes,now,now,spaceId,attendeeCount,endsAt,startsAt).run();
  if ((result.meta.changes ?? 0) !== 1) return Response.json({ error: "BOOKING_CONFLICT_OR_CAPACITY" }, { status: 409 });
  await db.prepare("INSERT INTO audit_logs (id,actor_id,action,entity_type,entity_id,metadata,created_at) VALUES (?,?,?,?,?,?,?)").bind(crypto.randomUUID(),user.id,"booking.created","booking",id,JSON.stringify({ spaceId,startsAt,endsAt }),now).run();
  return Response.json({ booking: { id, status: "confirmed", startsAt, endsAt } }, { status: 201 });
}
