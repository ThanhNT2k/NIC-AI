import { can } from "@/lib/access-control";
import { database, enforceRateLimit, requireCsrf } from "@/lib/d1-auth";
import { isWorkOrderPriority } from "@/lib/operations-policy";
import { addBusinessMinutes, type CalendarWindow } from "@/lib/p1-operations-policy";

export async function POST(request: Request) {
  const user = await requireCsrf(request); if (!user) return Response.json({ error: "CSRF_INVALID" }, { status: 403 });
  if (!can(user.role,"work_order:create") || user.departmentCode !== "facility") return Response.json({ error: "FORBIDDEN" }, { status: 403 });
  if (!await enforceRateLimit(request,"work-order.create",user.id,60,3600)) return Response.json({ error: "RATE_LIMITED" }, { status: 429 });
  const body = await request.json().catch(() => null) as { requestId?: unknown; title?: unknown; location?: unknown; priority?: unknown; assignedTo?: unknown; providerId?: unknown; scheduledAt?: unknown } | null;
  const requestId = typeof body?.requestId === "string" ? body.requestId : ""; const title = typeof body?.title === "string" ? body.title.trim() : ""; const location = typeof body?.location === "string" ? body.location.trim() : "";
  const priority = body?.priority; const assignedTo = typeof body?.assignedTo === "string" && body.assignedTo ? body.assignedTo : null; const providerId = typeof body?.providerId === "string" && body.providerId ? body.providerId : null; const scheduledAt = body?.scheduledAt ? Number(body.scheduledAt) : null;
  if (!requestId || title.length<3 || title.length>120 || !location || location.length>160 || !isWorkOrderPriority(priority) || (scheduledAt!==null && !Number.isInteger(scheduledAt))) return Response.json({ error: "WORK_ORDER_INVALID" }, { status: 400 });
  const db=await database();
  const source=await db.prepare("SELECT id FROM service_requests WHERE id=? AND target_department='facility'").bind(requestId).first(); if(!source) return Response.json({error:"REQUEST_NOT_FOUND"},{status:404});
  if(assignedTo){const member=await db.prepare("SELECT u.id FROM users u JOIN organization_memberships m ON m.user_id=u.id JOIN departments d ON d.id=m.department_id WHERE u.id=? AND d.code='facility' AND m.status='active'").bind(assignedTo).first();if(!member)return Response.json({error:"ASSIGNEE_OUTSIDE_TEAM"},{status:400});}
  if(providerId&&!await db.prepare("SELECT id FROM service_providers WHERE id=? AND status='active' AND service_types LIKE '%maintenance%'").bind(providerId).first())return Response.json({error:"PROVIDER_INVALID"},{status:400});
  const id=crypto.randomUUID();const now=Math.floor(Date.now()/1000);const status=scheduledAt?"scheduled":"open";
  const template=await db.prepare("SELECT id FROM operation_templates WHERE service_type=(SELECT service_type FROM service_requests WHERE id=?) AND status='active' ORDER BY version DESC LIMIT 1").bind(requestId).first<{id:string}>();
  const templateTasks=template?(await db.prepare("SELECT id,sequence,title,required FROM operation_template_tasks WHERE template_id=? ORDER BY sequence").bind(template.id).all<{id:string;sequence:number;title:string;required:number}>()).results:[];
  const calendar=await db.prepare("SELECT id,timezone,working_windows AS workingWindows FROM business_calendars WHERE status='active' ORDER BY id LIMIT 1").first<{id:string;timezone:string;workingWindows:string}>();
  const holidays=calendar?(await db.prepare("SELECT holiday_date AS holidayDate FROM business_calendar_holidays WHERE calendar_id=?").bind(calendar.id).all<{holidayDate:string}>()).results:[];
  const slaMinutes={low:960,normal:480,high:240,critical:60}[String(priority)]??480;
  const dueAt=calendar?addBusinessMinutes(now,slaMinutes,JSON.parse(calendar.workingWindows) as CalendarWindow[],new Set(holidays.map(item=>item.holidayDate)),calendar.timezone):now+slaMinutes*60;
  const warningAt=calendar?addBusinessMinutes(now,Math.max(1,Math.floor(slaMinutes*.75)),JSON.parse(calendar.workingWindows) as CalendarWindow[],new Set(holidays.map(item=>item.holidayDate)),calendar.timezone):now+Math.floor(slaMinutes*.75)*60;
  const slaId=crypto.randomUUID();const providerAssignmentId=providerId?crypto.randomUUID():null;
  try { await db.batch([
    db.prepare("INSERT INTO maintenance_work_orders (id,request_id,title,location,priority,status,assigned_to,provider_id,scheduled_at,resolution,created_by,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(id,requestId,title,location,priority,status,assignedTo,providerId,scheduledAt,"",user.id,now,now),
    db.prepare("UPDATE service_requests SET status='in_progress', assigned_to=COALESCE(?,assigned_to), updated_at=? WHERE id=? AND target_department='facility'").bind(assignedTo,now,requestId),
    db.prepare("INSERT INTO audit_logs (id,actor_id,action,entity_type,entity_id,metadata,created_at) VALUES (?,?,?,?,?,?,?)").bind(crypto.randomUUID(),user.id,"work_order.created","maintenance_work_order",id,JSON.stringify({requestId,providerId}),now),
    ...templateTasks.map(task=>db.prepare("INSERT INTO work_order_tasks (id,work_order_id,template_task_id,sequence,title,required,status,updated_at) VALUES (?,?,?,?,?,?,'pending',?)").bind(crypto.randomUUID(),id,task.id,task.sequence,task.title,task.required,now)),
    ...(calendar?[db.prepare("INSERT INTO sla_instances (id,work_order_id,calendar_id,warning_at,due_at,status,updated_at) VALUES (?,?,?,?,?,'running',?)").bind(slaId,id,calendar.id,warningAt,dueAt,now)]:[]),
    ...(providerId&&providerAssignmentId?[db.prepare("INSERT INTO provider_assignments (id,work_order_id,provider_id,version,status,response_deadline) VALUES (?,?,?,1,'awaiting_provider',?)").bind(providerAssignmentId,id,providerId,warningAt),db.prepare("INSERT INTO notifications (id,recipient_id,type,entity_type,entity_id,dedupe_key,title,body,created_at) SELECT ?,m.user_id,'provider_assignment','provider_assignment',?,?,?, ?,? FROM provider_memberships m WHERE m.provider_id=? AND m.status='active'").bind(crypto.randomUUID(),providerAssignmentId,`provider-assignment:${providerAssignmentId}`,'Có lệnh công việc mới',title,now,providerId)]:[]),
  ]); } catch { return Response.json({error:"ACTIVE_WORK_ORDER_EXISTS"},{status:409}); }
  return Response.json({workOrder:{id,status,requestId}},{status:201});
}
