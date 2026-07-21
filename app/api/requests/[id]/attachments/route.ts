import { MAX_ATTACHMENT_BYTES, safeAttachmentName, validateAttachment } from "@/lib/attachment-policy";
import { currentUser, database, enforceRateLimit, requireCsrf } from "@/lib/d1-auth";
import { canCommentRequest, canReadRequest, type ScopedRequest } from "@/lib/request-scope";

type AttachmentRow = { id:string;originalName:string;contentType:string;sizeBytes:number;sha256:string;validationStatus:string;uploadedBy:string;uploaderName:string;createdAt:number };

async function requestItem(id: string) {
  const db = await database();
  return db.prepare("SELECT id,owner_id AS ownerId,organization,status,target_department AS targetDepartment FROM service_requests WHERE id=?").bind(id).first<ScopedRequest>();
}

async function bucket() {
  const { env } = await import("cloudflare:workers");
  const attachments = (env as typeof env & { ATTACHMENTS?: R2Bucket }).ATTACHMENTS;
  if (!attachments) throw new Error("R2 binding ATTACHMENTS chưa được cấu hình.");
  return attachments;
}

function hex(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(bytes), value => value.toString(16).padStart(2, "0")).join("");
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await currentUser(request);
  if (!user) return Response.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  const { id } = await context.params;
  const item = await requestItem(id);
  if (!item || !canReadRequest(user, item)) return Response.json({ error: "REQUEST_NOT_FOUND" }, { status: 404 });
  const db = await database();
  const attachments = await db.prepare("SELECT a.id,a.original_name AS originalName,a.content_type AS contentType,a.size_bytes AS sizeBytes,a.sha256,a.validation_status AS validationStatus,a.uploaded_by AS uploadedBy,u.full_name AS uploaderName,a.created_at AS createdAt FROM request_attachments a JOIN users u ON u.id=a.uploaded_by WHERE a.request_id=? AND (a.validation_status='validated' OR (a.validation_status='quarantined' AND a.uploaded_by=?)) ORDER BY a.created_at ASC").bind(id,user.id).all<AttachmentRow>();
  return Response.json({ attachments: attachments.results, permissions: { canUpload: canCommentRequest(user, item) } });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireCsrf(request);
  if (!user) return Response.json({ error: "CSRF_INVALID" }, { status: 403 });
  if (!await enforceRateLimit(request, "request.attachment", user.id, 30, 3600)) return Response.json({ error: "RATE_LIMITED" }, { status: 429 });
  const { id } = await context.params;
  const item = await requestItem(id);
  if (!item || !canReadRequest(user, item)) return Response.json({ error: "REQUEST_NOT_FOUND" }, { status: 404 });
  if (!canCommentRequest(user, item)) return Response.json({ error: "ATTACHMENT_FORBIDDEN" }, { status: 403 });
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_ATTACHMENT_BYTES + 128 * 1024) return Response.json({ error: "ATTACHMENT_SIZE_INVALID" }, { status: 413 });
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return Response.json({ error: "ATTACHMENT_REQUIRED" }, { status: 400 });
  if (file.size > MAX_ATTACHMENT_BYTES) return Response.json({ error: "ATTACHMENT_SIZE_INVALID" }, { status: 413 });
  const bytes = new Uint8Array(await file.arrayBuffer());
  const validation = validateAttachment({ bytes, declaredType: file.type });
  if (!validation.ok) return Response.json({ error: validation.error }, { status: 400 });
  const attachmentId = crypto.randomUUID();
  const objectKey = `requests/${id}/${attachmentId}`;
  const originalName = safeAttachmentName(file.name);
  const sha256 = hex(await crypto.subtle.digest("SHA-256", bytes));
  const storage = await bucket();
  await storage.put(objectKey, bytes, { httpMetadata: { contentType: file.type }, customMetadata: { requestId: id, attachmentId, sha256 } });
  const db = await database();
  const now = Math.floor(Date.now() / 1000);
  try {
    await db.batch([
      db.prepare("INSERT INTO request_attachments (id,request_id,uploaded_by,object_key,original_name,content_type,size_bytes,sha256,validation_status,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)").bind(attachmentId,id,user.id,objectKey,originalName,file.type,file.size,sha256,"quarantined",now),
      db.prepare("INSERT INTO audit_logs (id,actor_id,action,entity_type,entity_id,metadata,created_at) VALUES (?,?,?,?,?,?,?)").bind(crypto.randomUUID(),user.id,"request.attachment_quarantined","service_request",id,JSON.stringify({ attachmentId,contentType:file.type,sizeBytes:file.size,sha256 }),now),
    ]);
  } catch (cause) {
    await storage.delete(objectKey);
    throw cause;
  }
  return Response.json({ attachment: { id:attachmentId,originalName,contentType:file.type,sizeBytes:file.size,sha256,validationStatus:"quarantined",uploadedBy:user.id,uploaderName:user.fullName,createdAt:now } }, { status: 202 });
}
