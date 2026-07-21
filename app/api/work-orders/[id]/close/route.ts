import { can } from "@/lib/access-control";
import { database, enforceRateLimit, requireCsrf } from "@/lib/d1-auth";

export async function POST(request:Request,context:{params:Promise<{id:string}>}){
  const user=await requireCsrf(request);if(!user)return Response.json({error:"CSRF_INVALID"},{status:403});
  if(user.role!=="facility_manager"&&!can(user.role,"system:manage_access"))return Response.json({error:"FORBIDDEN"},{status:403});
  if(!await enforceRateLimit(request,"work-order.close",user.id,60,3600))return Response.json({error:"RATE_LIMITED"},{status:429});
  const body=await request.json().catch(()=>null) as {decision?:unknown;note?:unknown}|null;const decision=body?.decision;const note=typeof body?.note==="string"?body.note.trim().slice(0,1000):"";
  if(decision!=="approved"&&decision!=="rejected")return Response.json({error:"DECISION_INVALID"},{status:400});
  const {id}=await context.params;const db=await database();const pending=await db.prepare("SELECT id,requested_by AS requestedBy FROM work_order_close_approvals WHERE work_order_id=? AND status='pending'").bind(id).first<{id:string;requestedBy:string}>();
  if(!pending)return Response.json({error:"CLOSE_APPROVAL_NOT_FOUND"},{status:404});if(pending.requestedBy===user.id)return Response.json({error:"MAKER_CANNOT_APPROVE"},{status:409});
  const blockers=await db.prepare("SELECT COUNT(*) AS count FROM work_order_tasks WHERE work_order_id=? AND required=1 AND status<>'completed'").bind(id).first<{count:number}>();if((blockers?.count??0)>0)return Response.json({error:"MANDATORY_TASKS_INCOMPLETE"},{status:409});
  const now=Math.floor(Date.now()/1000);const workOrderStatus=decision==="approved"?"completed":"in_progress";
  await db.batch([db.prepare("UPDATE work_order_close_approvals SET status=?,decided_by=?,decided_at=?,note=CASE WHEN ?='' THEN note ELSE ? END WHERE id=? AND status='pending'").bind(decision,user.id,now,note,note,pending.id),db.prepare("UPDATE maintenance_work_orders SET status=?,updated_at=? WHERE id=?").bind(workOrderStatus,now,id),db.prepare("UPDATE service_requests SET status=?,updated_at=? WHERE id=(SELECT request_id FROM maintenance_work_orders WHERE id=?)").bind(decision==="approved"?"resolved":"in_progress",now,id),db.prepare("INSERT INTO audit_logs (id,actor_id,action,entity_type,entity_id,metadata,created_at) VALUES (?,?,?,?,?,?,?)").bind(crypto.randomUUID(),user.id,`work_order.close_${decision}`,"maintenance_work_order",id,JSON.stringify({note}),now)]);
  return Response.json({workOrder:{id,status:workOrderStatus},decision});
}
