import { database, sha256 } from "@/lib/d1-auth";
import { redactForLog } from "@/lib/enterprise-policy";

type Db = Awaited<ReturnType<typeof database>>;
type Level = "info" | "warn" | "error";

export function requestContext(request: Request) {
  const incoming = request.headers.get("x-correlation-id")?.trim();
  const correlationId = incoming && /^[a-zA-Z0-9._:-]{8,120}$/.test(incoming) ? incoming : crypto.randomUUID();
  return { correlationId, traceId: crypto.randomUUID().replaceAll("-", ""), startedAt: Date.now() };
}

export async function recordOperationalEvent(db: Db, input: { correlationId: string; traceId: string; level: Level; eventName: string; route: string; actorId?: string | null; statusCode?: number; startedAt?: number; errorCode?: string | null; metadata?: unknown }) {
  const now = Math.floor(Date.now() / 1000);
  const safeMetadata = redactForLog(input.metadata ?? {});
  const actorHash = input.actorId ? await sha256(`actor:${input.actorId}`) : null;
  const durationMs = input.startedAt ? Math.max(0, Date.now() - input.startedAt) : null;
  const entry = { level: input.level, event: input.eventName, correlationId: input.correlationId, traceId: input.traceId, route: input.route, statusCode: input.statusCode ?? null, durationMs, errorCode: input.errorCode ?? null, metadata: safeMetadata };
  console.log(JSON.stringify(entry));
  await db.prepare("INSERT INTO observability_events (id,correlation_id,trace_id,level,event_name,route,actor_hash,status_code,duration_ms,error_code,metadata,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)").bind(crypto.randomUUID(),input.correlationId,input.traceId,input.level,input.eventName,input.route,actorHash,input.statusCode??null,durationMs,input.errorCode??null,JSON.stringify(safeMetadata),now).run();
}

export function observedJson(body: unknown, status: number, correlationId: string, traceId: string) {
  return Response.json(body, { status, headers: { "x-correlation-id": correlationId, "traceparent": `00-${traceId}-0000000000000001-01`, "cache-control": "no-store" } });
}

export function incidentStatement(db: Db, input: { correlationId: string; source: string; severity: "warning" | "critical"; title: string; runbook: string; dedupeKey: string; now: number }) {
  return db.prepare("INSERT INTO operational_incidents (id,correlation_id,source,severity,title,status,runbook,dedupe_key,created_at) VALUES (?,?,?,?,?,'open',?,?,?) ON CONFLICT(dedupe_key) DO NOTHING").bind(crypto.randomUUID(),input.correlationId,input.source,input.severity,input.title,input.runbook,input.dedupeKey,input.now);
}
