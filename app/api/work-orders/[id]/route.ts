import { can } from "@/lib/access-control";
import { database, enforceRateLimit, requireCsrf } from "@/lib/d1-auth";
import { canTransitionWorkOrder, isWorkOrderStatus } from "@/lib/operations-policy";

type Row={id:string;requestId:string;status:string;assignedTo:string|null};
export async function PATCH(request:Request,context:{params:Promise<{id:string}>}){
  const user=await requireCsrf(request);if(!user)return Response.json({error:"CSRF_INVALID"},{status:403});
  if(!can(user.role,"work_order:manage")||user.departmentCode!=="facility")return Response.json({error:"FORBIDDEN"},{status:403});
  if(!await enforceRateLimit(request,"work-order.update",user.id,120,3600))return Response.json({error:"RATE_LIMITED"},{status:429});
  const body=await request.json().catch(()=>null) as {status?:unknown;assignedTo?:unknown;resolution?:unknown;scheduledAt?:unknown}|null;const {id}=await context.params;const db=await database();
  const current=await db.prepare("SELECT id,request_id AS requestId,status,assigned_to AS assignedTo FROM maintenance_work_orders WHERE id=?").bind(id).first<Row>();if(!current)return Response.json({error:"WORK_ORDER_NOT_FOUND"},{status:404});
  const status=body?.status===undefined?current.status:body.status;if(!isWorkOrderStatus(status)||!canTransitionWorkOrder(current.status,status))return Response.json({error:"INVALID_STATUS_TRANSITION"},{status:409});
  const assignedTo=body?.assignedTo===undefined?current.assignedTo:body.assignedTo===null?null:typeof body.assignedTo==="string"?body.assignedTo:undefined;if(assignedTo===undefined)return Response.json({error:"INVALID_ASSIGNEE"},{status:400});
  if(assignedTo){const member=await db.prepare("SELECT u.id FROM users u JOIN organization_memberships m ON m.user_id=u.id JOIN departments d ON d.id=m.department_id WHERE u.id=? AND d.code='facility' AND m.status='active'").bind(assignedTo).first();if(!member)return Response.json({error:"ASSIGNEE_OUTSIDE_TEAM"},{status:400});}
  const resolution=typeof body?.resolution==="string"?body.resolution.trim():"";if(resolution.length>2000||(status==="completed"&&resolution.length<3))return Response.json({error:"RESOLUTION_REQUIRED"},{status:400});const scheduledAt=body?.scheduledAt?Number(body.scheduledAt):null;const now=Math.floor(Date.now()/1000);
  await db.batch([db.prepare("UPDATE maintenance_work_orders SET status=?,assigned_to=?,scheduled_at=COALESCE(?,scheduled_at),resolution=?,updated_at=? WHERE id=?").bind(status,assignedTo,scheduledAt,resolution,now,id),db.prepare("UPDATE service_requests SET status=?,updated_at=? WHERE id=?").bind(status==="completed"?"resolved":status==="cancelled"?"cancelled":"in_progress",now,current.requestId),db.prepare("INSERT INTO audit_logs (id,actor_id,action,entity_type,entity_id,metadata,created_at) VALUES (?,?,?,?,?,?,?)").bind(crypto.randomUUID(),user.id,"work_order.updated","maintenance_work_order",id,JSON.stringify({fromStatus:current.status,toStatus:status}),now)]);
  return Response.json({workOrder:{id,status,assignedTo,updatedAt:now}});
}
