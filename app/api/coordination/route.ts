import { can } from "@/lib/access-control";
import { canTransitionEventService, canTransitionVisitor } from "@/lib/coordination-policy";
import { currentUser, database, enforceRateLimit, requireCsrf } from "@/lib/d1-auth";

const cateringPackages = new Set(["none", "tea_break_standard", "tea_break_premium"]);
function clean(value: unknown, max: number) { return typeof value === "string" ? value.trim().slice(0, max) : ""; }

export async function GET(request: Request) {
  const user = await currentUser(request); if (!user) return Response.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  const db = await database();
  const manageVisitors = can(user.role, "visitor:manage"); const manageEvents = can(user.role, "event_service:manage");
  const visitors = manageVisitors
    ? await db.prepare("SELECT v.id,v.visitor_name AS visitorName,v.visitor_phone AS visitorPhone,v.host_name AS hostName,v.visit_at AS visitAt,v.purpose,v.status,v.badge_code AS badgeCode,v.checked_in_at AS checkedInAt,v.checked_out_at AS checkedOutAt,v.organization,u.full_name AS requesterName FROM visitor_registrations v JOIN users u ON u.id=v.requester_id ORDER BY v.visit_at DESC LIMIT 100").all()
    : await db.prepare("SELECT id,visitor_name AS visitorName,visitor_phone AS visitorPhone,host_name AS hostName,visit_at AS visitAt,purpose,status,badge_code AS badgeCode,checked_in_at AS checkedInAt,checked_out_at AS checkedOutAt,organization FROM visitor_registrations WHERE requester_id=? AND organization=? ORDER BY visit_at DESC LIMIT 50").bind(user.id,user.organization).all();
  const events = manageEvents
    ? await db.prepare("SELECT e.id,e.event_name AS eventName,e.event_at AS eventAt,e.attendee_count AS attendeeCount,e.catering_package AS cateringPackage,e.servings,e.logistics_notes AS logisticsNotes,e.provider_id AS providerId,e.status,e.organization,p.name AS providerName,u.full_name AS requesterName FROM event_service_orders e JOIN users u ON u.id=e.requester_id LEFT JOIN service_providers p ON p.id=e.provider_id ORDER BY e.event_at DESC LIMIT 100").all()
    : await db.prepare("SELECT e.id,e.event_name AS eventName,e.event_at AS eventAt,e.attendee_count AS attendeeCount,e.catering_package AS cateringPackage,e.servings,e.logistics_notes AS logisticsNotes,e.provider_id AS providerId,e.status,e.organization,p.name AS providerName FROM event_service_orders e LEFT JOIN service_providers p ON p.id=e.provider_id WHERE e.requester_id=? AND e.organization=? ORDER BY e.event_at DESC LIMIT 50").bind(user.id,user.organization).all();
  const providers = can(user.role,"provider:read") ? (await db.prepare("SELECT id,name,service_types AS serviceTypes,contact_name AS contactName,contact_phone AS contactPhone FROM service_providers WHERE status='active' ORDER BY name").all()).results : [];
  return Response.json({ mode: manageVisitors || manageEvents ? "operations" : "customer", canManageVisitors: manageVisitors, canManageEvents: manageEvents, visitors: visitors.results, events: events.results, providers });
}

export async function POST(request: Request) {
  const user = await requireCsrf(request); if (!user) return Response.json({ error: "CSRF_OR_AUTH_REQUIRED" }, { status: 403 });
  if (!await enforceRateLimit(request,"coordination.create",user.id,30,3600)) return Response.json({ error: "RATE_LIMITED" }, { status: 429 });
  const body = await request.json().catch(()=>null) as Record<string,unknown>|null; const kind=body?.kind; const now=Math.floor(Date.now()/1000); const db=await database(); const id=crypto.randomUUID();
  if(kind==="visitor"){
    if(!can(user.role,"visitor:create"))return Response.json({error:"FORBIDDEN"},{status:403});
    const visitorName=clean(body?.visitorName,120),visitorPhone=clean(body?.visitorPhone,40),hostName=clean(body?.hostName,120),purpose=clean(body?.purpose,500),visitAt=Number(body?.visitAt);
    if(visitorName.length<2||visitorPhone.length<6||hostName.length<2||purpose.length<3||!Number.isInteger(visitAt)||visitAt<=now)return Response.json({error:"VISITOR_INVALID"},{status:400});
    const badgeCode=`NIC-${crypto.randomUUID().slice(0,8).toUpperCase()}`;
    await db.batch([db.prepare("INSERT INTO visitor_registrations (id,requester_id,organization,visitor_name,visitor_phone,host_name,visit_at,purpose,status,badge_code,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,'pending',?,?,?)").bind(id,user.id,user.organization,visitorName,visitorPhone,hostName,visitAt,purpose,badgeCode,now,now),db.prepare("INSERT INTO audit_logs (id,actor_id,action,entity_type,entity_id,metadata,created_at) VALUES (?,?,?,?,?,?,?)").bind(crypto.randomUUID(),user.id,"visitor.created","visitor_registration",id,JSON.stringify({visitAt}),now)]);
    return Response.json({id,status:"pending",badgeCode},{status:201});
  }
  if(kind==="event_service"){
    if(!can(user.role,"event_service:create"))return Response.json({error:"FORBIDDEN"},{status:403});
    const eventName=clean(body?.eventName,160),eventAt=Number(body?.eventAt),attendeeCount=Number(body?.attendeeCount),cateringPackage=clean(body?.cateringPackage,40),servings=Number(body?.servings),logisticsNotes=clean(body?.logisticsNotes,1500);
    if(eventName.length<3||!Number.isInteger(eventAt)||eventAt<=now||!Number.isInteger(attendeeCount)||attendeeCount<1||attendeeCount>2000||!cateringPackages.has(cateringPackage)||!Number.isInteger(servings)||servings<0||servings>attendeeCount||(cateringPackage!=="none"&&servings<1))return Response.json({error:"EVENT_SERVICE_INVALID"},{status:400});
    await db.batch([db.prepare("INSERT INTO event_service_orders (id,requester_id,organization,event_name,event_at,attendee_count,catering_package,servings,logistics_notes,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,'requested',?,?)").bind(id,user.id,user.organization,eventName,eventAt,attendeeCount,cateringPackage,servings,logisticsNotes,now,now),db.prepare("INSERT INTO audit_logs (id,actor_id,action,entity_type,entity_id,metadata,created_at) VALUES (?,?,?,?,?,?,?)").bind(crypto.randomUUID(),user.id,"event_service.created","event_service_order",id,JSON.stringify({eventAt,cateringPackage}),now)]);
    return Response.json({id,status:"requested"},{status:201});
  }
  return Response.json({error:"KIND_INVALID"},{status:400});
}

export async function PATCH(request: Request) {
  const user=await requireCsrf(request);if(!user)return Response.json({error:"CSRF_OR_AUTH_REQUIRED"},{status:403});
  if(!await enforceRateLimit(request,"coordination.update",user.id,120,3600))return Response.json({error:"RATE_LIMITED"},{status:429});
  const body=await request.json().catch(()=>null) as Record<string,unknown>|null;const kind=body?.kind,id=clean(body?.id,80),status=clean(body?.status,40),providerId=clean(body?.providerId,80)||null,now=Math.floor(Date.now()/1000),db=await database();if(!id)return Response.json({error:"ID_REQUIRED"},{status:400});
  if(kind==="visitor"){
    if(!can(user.role,"visitor:manage"))return Response.json({error:"FORBIDDEN"},{status:403});const current=await db.prepare("SELECT status FROM visitor_registrations WHERE id=?").bind(id).first<{status:string}>();if(!current)return Response.json({error:"VISITOR_NOT_FOUND"},{status:404});if(!canTransitionVisitor(current.status,status))return Response.json({error:"STATUS_INVALID"},{status:409});
    await db.batch([db.prepare("UPDATE visitor_registrations SET status=?,checked_in_at=CASE WHEN ?='checked_in' THEN ? ELSE checked_in_at END,checked_out_at=CASE WHEN ?='checked_out' THEN ? ELSE checked_out_at END,updated_at=? WHERE id=?").bind(status,status,now,status,now,now,id),db.prepare("INSERT INTO audit_logs (id,actor_id,action,entity_type,entity_id,metadata,created_at) VALUES (?,?,?,?,?,?,?)").bind(crypto.randomUUID(),user.id,"visitor.status_updated","visitor_registration",id,JSON.stringify({from:current.status,to:status}),now)]);return Response.json({id,status});
  }
  if(kind==="event_service"){
    if(!can(user.role,"event_service:manage"))return Response.json({error:"FORBIDDEN"},{status:403});const current=await db.prepare("SELECT status FROM event_service_orders WHERE id=?").bind(id).first<{status:string}>();if(!current)return Response.json({error:"EVENT_SERVICE_NOT_FOUND"},{status:404});if(!canTransitionEventService(current.status,status))return Response.json({error:"STATUS_INVALID"},{status:409});if(status==="confirmed"&&!providerId)return Response.json({error:"PROVIDER_REQUIRED"},{status:400});if(providerId&&!await db.prepare("SELECT id FROM service_providers WHERE id=? AND status='active'").bind(providerId).first())return Response.json({error:"PROVIDER_INVALID"},{status:400});
    await db.batch([db.prepare("UPDATE event_service_orders SET status=?,provider_id=COALESCE(?,provider_id),updated_at=? WHERE id=?").bind(status,providerId,now,id),db.prepare("INSERT INTO audit_logs (id,actor_id,action,entity_type,entity_id,metadata,created_at) VALUES (?,?,?,?,?,?,?)").bind(crypto.randomUUID(),user.id,"event_service.status_updated","event_service_order",id,JSON.stringify({from:current.status,to:status,providerId}),now)]);return Response.json({id,status});
  }
  return Response.json({error:"KIND_INVALID"},{status:400});
}
