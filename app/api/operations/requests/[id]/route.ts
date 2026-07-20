import { can } from "@/lib/access-control";
import { database, enforceRateLimit, requireCsrf } from "@/lib/d1-auth";
import { canTransitionRequest, isRequestStatus } from "@/lib/operations-policy";

type RequestRow = { id: string; status: string; targetDepartment: string; assignedTo: string | null };

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireCsrf(request);
  if (!user) return Response.json({ error: "CSRF_INVALID" }, { status: 403 });
  if (!can(user.role, "request:update_status") || !user.departmentCode) return Response.json({ error: "FORBIDDEN" }, { status: 403 });
  if (!await enforceRateLimit(request, "operations.request.update", user.id, 120, 3600)) return Response.json({ error: "RATE_LIMITED" }, { status: 429 });
  const body = await request.json().catch(() => null) as { status?: unknown; assignedTo?: unknown } | null;
  const { id } = await context.params;
  const db = await database();
  const current = await db.prepare("SELECT id, status, target_department AS targetDepartment, assigned_to AS assignedTo FROM service_requests WHERE id = ? AND target_department = ?").bind(id, user.departmentCode).first<RequestRow>();
  if (!current) return Response.json({ error: "REQUEST_NOT_FOUND" }, { status: 404 });
  const nextStatus = body?.status === undefined ? current.status : body.status;
  if (!isRequestStatus(nextStatus) || !canTransitionRequest(current.status, nextStatus)) return Response.json({ error: "INVALID_STATUS_TRANSITION" }, { status: 409 });
  const assignedTo = body?.assignedTo === undefined ? current.assignedTo : body.assignedTo === null ? null : typeof body.assignedTo === "string" ? body.assignedTo : undefined;
  if (assignedTo === undefined) return Response.json({ error: "INVALID_ASSIGNEE" }, { status: 400 });
  if (assignedTo !== current.assignedTo && !can(user.role, "request:route")) return Response.json({ error: "ASSIGNMENT_FORBIDDEN" }, { status: 403 });
  if (assignedTo) {
    const member = await db.prepare("SELECT u.id FROM users u JOIN organization_memberships m ON m.user_id = u.id JOIN departments d ON d.id = m.department_id WHERE u.id = ? AND d.code = ? AND m.status = 'active'").bind(assignedTo, current.targetDepartment).first();
    if (!member) return Response.json({ error: "ASSIGNEE_OUTSIDE_TEAM" }, { status: 400 });
  }
  const now = Math.floor(Date.now() / 1000);
  await db.batch([
    db.prepare("UPDATE service_requests SET status = ?, assigned_to = ?, updated_at = ? WHERE id = ? AND target_department = ?").bind(nextStatus, assignedTo, now, id, user.departmentCode),
    db.prepare("INSERT INTO audit_logs (id,actor_id,action,entity_type,entity_id,metadata,created_at) VALUES (?,?,?,?,?,?,?)").bind(crypto.randomUUID(), user.id, "request.operated", "service_request", id, JSON.stringify({ fromStatus: current.status, toStatus: nextStatus, fromAssignee: current.assignedTo, toAssignee: assignedTo }), now),
  ]);
  return Response.json({ request: { id, status: nextStatus, assignedTo, updatedAt: now } });
}
