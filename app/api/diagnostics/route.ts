import { can } from "@/lib/access-control";
import { currentUser, database } from "@/lib/d1-auth";

export async function GET(request: Request) {
  const user = await currentUser(request);
  if (!user) return Response.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  if (!can(user.role,"platform:manage") && user.role !== "auditor") return Response.json({ error: "FORBIDDEN" }, { status: 403 });
  const correlationId = new URL(request.url).searchParams.get("correlationId")?.trim().slice(0,120), db = await database();
  const query = correlationId
    ? db.prepare("SELECT id,correlation_id AS correlationId,trace_id AS traceId,route,error_class AS errorClass,error_code AS errorCode,safe_message AS safeMessage,frames,created_at AS createdAt FROM diagnostic_reports WHERE correlation_id=? ORDER BY created_at DESC LIMIT 50").bind(correlationId)
    : db.prepare("SELECT id,correlation_id AS correlationId,trace_id AS traceId,route,error_class AS errorClass,error_code AS errorCode,safe_message AS safeMessage,frames,created_at AS createdAt FROM diagnostic_reports ORDER BY created_at DESC LIMIT 50");
  const rows = (await query.all<Record<string,unknown>>()).results.map(row => ({...row,frames:JSON.parse(String(row.frames))}));
  return Response.json({ diagnostics: rows });
}
