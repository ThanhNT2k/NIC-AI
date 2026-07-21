import { currentUser, database } from "@/lib/d1-auth";
import { canReadRequest, type ScopedRequest } from "@/lib/request-scope";

type DownloadRow = ScopedRequest & { objectKey:string;originalName:string;contentType:string;sha256:string };

export async function GET(request: Request, context: { params: Promise<{ id: string; attachmentId: string }> }) {
  const user = await currentUser(request);
  if (!user) return Response.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  const { id, attachmentId } = await context.params;
  const db = await database();
  const item = await db.prepare("SELECT r.id,r.owner_id AS ownerId,r.organization,r.status,r.target_department AS targetDepartment,a.object_key AS objectKey,a.original_name AS originalName,a.content_type AS contentType,a.sha256 FROM request_attachments a JOIN service_requests r ON r.id=a.request_id WHERE a.id=? AND a.request_id=? AND a.validation_status='validated'").bind(attachmentId,id).first<DownloadRow>();
  if (!item || !canReadRequest(user, item)) return Response.json({ error: "ATTACHMENT_NOT_FOUND" }, { status: 404 });
  const { env } = await import("cloudflare:workers");
  const storage = (env as typeof env & { ATTACHMENTS?: R2Bucket }).ATTACHMENTS;
  if (!storage) return Response.json({ error: "ATTACHMENT_STORAGE_UNAVAILABLE" }, { status: 503 });
  const object = await storage.get(item.objectKey);
  if (!object) return Response.json({ error: "ATTACHMENT_NOT_FOUND" }, { status: 404 });
  const headers = new Headers({
    "Content-Type": item.contentType,
    "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(item.originalName)}`,
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "sandbox",
    "ETag": `\"${item.sha256}\"`,
  });
  return new Response(object.body, { headers });
}
