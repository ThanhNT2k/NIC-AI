import { can } from "@/lib/access-control";
import { currentUser, database } from "@/lib/d1-auth";

export async function GET(request: Request) {
  const user = await currentUser(request);
  if (!user) return Response.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  if (!can(user.role, "request:read:assigned_team") || !user.departmentCode) return Response.json({ error: "FORBIDDEN" }, { status: 403 });
  const db = await database();
  const requests = await db.prepare("SELECT r.id, r.service_type AS serviceType, r.title, r.details, r.status, r.target_department AS targetDepartment, r.assigned_to AS assignedTo, owner.full_name AS requesterName, assignee.full_name AS assigneeName, r.created_at AS createdAt, COALESCE(r.updated_at,r.created_at) AS updatedAt FROM service_requests r JOIN users owner ON owner.id = r.owner_id LEFT JOIN users assignee ON assignee.id = r.assigned_to WHERE r.target_department = ? ORDER BY CASE r.status WHEN 'submitted' THEN 0 WHEN 'triaged' THEN 1 WHEN 'in_progress' THEN 2 WHEN 'waiting_customer' THEN 3 ELSE 4 END, r.created_at ASC LIMIT 100").bind(user.departmentCode).all();
  const staff = await db.prepare("SELECT u.id, u.full_name AS fullName, m.role FROM organization_memberships m JOIN users u ON u.id = m.user_id JOIN departments d ON d.id = m.department_id WHERE d.code = ? AND m.status = 'active' ORDER BY u.full_name").bind(user.departmentCode).all();
  let bookings: unknown[] = [];
  let workOrders: unknown[] = [];
  if (user.departmentCode === "facility") {
    const now = Math.floor(Date.now() / 1000);
    bookings = (await db.prepare("SELECT b.id, b.title, b.starts_at AS startsAt, b.ends_at AS endsAt, b.attendee_count AS attendeeCount, b.status, s.name AS spaceName, u.full_name AS requesterName FROM bookings b JOIN spaces s ON s.id = b.space_id JOIN users u ON u.id = b.requester_id WHERE b.status = 'confirmed' AND b.ends_at >= ? ORDER BY b.starts_at LIMIT 50").bind(now).all()).results;
    workOrders = (await db.prepare("SELECT w.id, w.request_id AS requestId, w.title, w.location, w.priority, w.status, w.assigned_to AS assignedTo, u.full_name AS assigneeName, w.scheduled_at AS scheduledAt, w.resolution, w.updated_at AS updatedAt FROM maintenance_work_orders w LEFT JOIN users u ON u.id = w.assigned_to ORDER BY CASE w.status WHEN 'open' THEN 0 WHEN 'scheduled' THEN 1 WHEN 'in_progress' THEN 2 ELSE 3 END, CASE w.priority WHEN 'critical' THEN 0 WHEN 'high' THEN 1 ELSE 2 END, w.updated_at DESC LIMIT 100").all()).results;
  }
  return Response.json({ department: user.departmentCode, requests: requests.results, staff: staff.results, bookings, workOrders });
}
