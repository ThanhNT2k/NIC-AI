import { currentUser, database } from "@/lib/d1-auth";
import { validBookingWindow } from "@/lib/operations-policy";

export async function GET(request: Request) {
  const user = await currentUser(request); if (!user) return Response.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  const url = new URL(request.url); const spaceId = url.searchParams.get("spaceId") ?? "";
  const startsAt = Number(url.searchParams.get("startsAt")); const endsAt = Number(url.searchParams.get("endsAt"));
  if (!spaceId || !validBookingWindow(startsAt,endsAt)) return Response.json({ error: "BOOKING_WINDOW_INVALID" }, { status: 400 });
  const db = await database();
  const conflict = await db.prepare("SELECT id,title,starts_at AS startsAt,ends_at AS endsAt FROM bookings WHERE space_id=? AND status='confirmed' AND starts_at < ? AND ends_at > ? LIMIT 1").bind(spaceId,endsAt,startsAt).first();
  return Response.json({ available: !conflict, conflict: canSeeConflict(user.role) ? conflict : conflict ? { occupied: true } : null });
}

function canSeeConflict(role: string) { return role === "facility_staff" || role === "facility_manager" || role === "system_admin"; }
