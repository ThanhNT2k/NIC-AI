import { sha256 } from "@/lib/d1-auth";
import { diagnosticPreview } from "@/lib/diagnostics-policy";
type DiagnosticDb = { prepare(query: string): { bind(...values: unknown[]): { run(): Promise<unknown> } } };

export async function recordDiagnostic(db: DiagnosticDb, input: { error: unknown; correlationId: string; traceId: string; route: string; actorId?: string | null }) {
  const id = crypto.randomUUID(), now = Math.floor(Date.now() / 1000), preview = diagnosticPreview(input.error);
  const actorHash = input.actorId ? await sha256(`actor:${input.actorId}`) : null;
  await db.prepare("INSERT INTO diagnostic_reports (id,correlation_id,trace_id,route,error_class,error_code,safe_message,frames,actor_hash,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)")
    .bind(id,input.correlationId,input.traceId,input.route,preview.errorClass,preview.errorCode,preview.safeMessage,JSON.stringify(preview.frames),actorHash,now).run();
  return { id, ...preview };
}
