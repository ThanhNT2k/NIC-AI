import { can } from "@/lib/access-control";
import { database, enforceRateLimit, requireCsrf } from "@/lib/d1-auth";
import { isWorkOrderPriority } from "@/lib/operations-policy";

export async function POST(request: Request) {
  const user = await requireCsrf(request); if (!user) return Response.json({ error: "CSRF_INVALID" }, { status: 403 });
  if (!can(user.role,"work_order:create") || user.departmentCode !== "facility") return Response.json({ error: "FORBIDDEN" }, { status: 403 });
  if (!await enforceRateLimit(request,"work-order.create",user.id,60,3600)) return Response.json({ error: "RATE_LIMITED" }, { status: 429 });
  const body = await request.json().catch(() => null) as { requestId?: unknown; title?: unknown; location?: unknown; priority?: unknown; assignedTo?: unknown; scheduledAt?: unknown } | null;
  const requestId = typeof body?.requestId === "string" ? body.requestId : ""; const title = typeof body?.title === "string" ? body.title.trim() : ""; const location = typeof body?.location === "string" ? body.location.trim() : "";
  const priority = body?.priority; const assignedTo = typeof body?.assignedTo === "string" && body.assignedTo ? body.assignedTo : null; const scheduledAt = body?.scheduledAt ? Number(body.scheduledAt) : null;
  if (!requestId || title.length<3 || title.length>120 || !location || location.length>160 || !isWorkOrderPriority(priority) || (scheduledAt!==null && !Number.isInteger(scheduledAt))) return Response.json({ error: "WORK_ORDER_INVALID" }, { status: 400 });
  const db=await database();
  const source=await db.prepare("SELECT id FROM service_requests WHERE id=? AND target_department='facility'").bind(requestId).first(); if(!source) return Response.json({error:"REQUEST_NOT_FOUND"},{status:404});
  if(assignedTo){const member=await db.prepare("SELECT u.id FROM users u JOIN organization_memberships m ON m.user_id=u.id JOIN departments d ON d.id=m.department_id WHERE u.id=? AND d.code='facility' AND m.status='active'").bind(assignedTo).first();if(!member)return Response.json({error:"ASSIGNEE_OUTSIDE_TEAM"},{status:400});}
  const id=crypto.randomUUID();const now=Math.floor(Date.now()/1000);const status=scheduledAt?"scheduled":"open";
  try { await db.batch([
    db.prepare("INSERT INTO maintenance_work_orders (id,request_id,title,location,priority,status,assigned_to,scheduled_at,resolution,created_by,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)").bind(id,requestId,title,location,priority,status,assignedTo,scheduledAt,"",user.id,now,now),
    db.prepare("UPDATE service_requests SET status='in_progress', assigned_to=COALESCE(?,assigned_to), updated_at=? WHERE id=? AND target_department='facility'").bind(assignedTo,now,requestId),
    db.prepare("INSERT INTO audit_logs (id,actor_id,action,entity_type,entity_id,metadata,created_at) VALUES (?,?,?,?,?,?,?)").bind(crypto.randomUUID(),user.id,"work_order.created","maintenance_work_order",id,JSON.stringify({requestId}),now),
  ]); } catch { return Response.json({error:"ACTIVE_WORK_ORDER_EXISTS"},{status:409}); }
  return Response.json({workOrder:{id,status,requestId}},{status:201});
}
