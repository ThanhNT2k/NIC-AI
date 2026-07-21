import { currentUser, database, enforceRateLimit, requireCsrf, type SessionUser } from "@/lib/d1-auth";
import { canCustomerCancelRequest } from "@/lib/operations-policy";
import { canCommentRequest, canReadRequest } from "@/lib/request-scope";

type RequestRow = {
  id: string;
  ownerId: string;
  organization: string;
  serviceType: string;
  title: string;
  details: string;
  status: string;
  targetDepartment: string;
  assignedTo: string | null;
  createdAt: number;
  updatedAt: number;
};

async function findScopedRequest(user: SessionUser, id: string) {
  const db = await database();
  const item = await db.prepare("SELECT id,owner_id AS ownerId,organization,service_type AS serviceType,title,details,status,target_department AS targetDepartment,assigned_to AS assignedTo,created_at AS createdAt,updated_at AS updatedAt FROM service_requests WHERE id=?").bind(id).first<RequestRow>();
  return item && canReadRequest(user, item) ? item : null;
}

function parseMetadata(value: unknown) {
  if (typeof value !== "string") return {};
  try { return JSON.parse(value) as Record<string, unknown>; } catch { return {}; }
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await currentUser(request);
  if (!user) return Response.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  const { id } = await context.params;
  const item = await findScopedRequest(user, id);
  if (!item) return Response.json({ error: "REQUEST_NOT_FOUND" }, { status: 404 });
  const db = await database();
  const [comments, timeline, attachments] = await Promise.all([
    db.prepare("SELECT c.id,c.author_id AS authorId,u.full_name AS authorName,u.role AS authorRole,c.body,c.created_at AS createdAt FROM request_comments c JOIN users u ON u.id=c.author_id WHERE c.request_id=? ORDER BY c.created_at ASC").bind(id).all(),
    db.prepare("SELECT a.id,a.action,a.metadata,a.created_at AS createdAt,u.full_name AS actorName FROM audit_logs a JOIN users u ON u.id=a.actor_id WHERE a.entity_type='service_request' AND a.entity_id=? ORDER BY a.created_at ASC").bind(id).all<{ id: string; action: string; metadata: string; createdAt: number; actorName: string }>(),
    db.prepare("SELECT a.id,a.original_name AS originalName,a.content_type AS contentType,a.size_bytes AS sizeBytes,a.sha256,a.uploaded_by AS uploadedBy,u.full_name AS uploaderName,a.created_at AS createdAt FROM request_attachments a JOIN users u ON u.id=a.uploaded_by WHERE a.request_id=? AND a.validation_status='validated' ORDER BY a.created_at ASC").bind(id).all(),
  ]);
  return Response.json({
    request: item,
    comments: comments.results,
    attachments: attachments.results,
    timeline: timeline.results.map((entry) => ({ ...entry, metadata: parseMetadata(entry.metadata) })),
    permissions: {
      canComment: canCommentRequest(user, item),
      canUploadAttachment: canCommentRequest(user, item),
      canCancel: item.ownerId === user.id && item.organization === user.organization && canCustomerCancelRequest(item.status),
    },
  });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireCsrf(request);
  if (!user) return Response.json({ error: "CSRF_INVALID" }, { status: 403 });
  if (!await enforceRateLimit(request, "request.collaboration", user.id, 120, 3600)) return Response.json({ error: "RATE_LIMITED" }, { status: 429 });
  const body = await request.json().catch(() => null) as { action?: unknown; body?: unknown } | null;
  const { id } = await context.params;
  const item = await findScopedRequest(user, id);
  if (!item) return Response.json({ error: "REQUEST_NOT_FOUND" }, { status: 404 });
  const db = await database();
  const now = Math.floor(Date.now() / 1000);

  if (body?.action === "comment") {
    const message = typeof body.body === "string" ? body.body.trim() : "";
    if (!message || message.length > 2000) return Response.json({ error: "COMMENT_INVALID" }, { status: 400 });
    if (item.status === "cancelled") return Response.json({ error: "REQUEST_CLOSED" }, { status: 409 });
    if (!canCommentRequest(user, item)) return Response.json({ error: "COMMENT_FORBIDDEN" }, { status: 403 });
    const commentId = crypto.randomUUID();
    const noticeTitle = `Trao đổi mới · ${item.title}`;
    const statements = [
      db.prepare("INSERT INTO request_comments (id,request_id,author_id,body,created_at) VALUES (?,?,?,?,?)").bind(commentId, id, user.id, message, now),
      db.prepare("INSERT INTO audit_logs (id,actor_id,action,entity_type,entity_id,metadata,created_at) VALUES (?,?,?,?,?,?,?)").bind(crypto.randomUUID(), user.id, "request.comment_added", "service_request", id, JSON.stringify({ commentId }), now),
    ];
    if (user.id !== item.ownerId) {
      statements.push(db.prepare("INSERT INTO notifications (id,recipient_id,type,entity_type,entity_id,dedupe_key,title,body,created_at) VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(dedupe_key) DO NOTHING").bind(crypto.randomUUID(), item.ownerId, "request_comment", "service_request", id, `request-comment:${commentId}:${item.ownerId}`, noticeTitle, message.slice(0, 240), now));
    } else {
      statements.push(db.prepare("INSERT INTO notifications (id,recipient_id,type,entity_type,entity_id,dedupe_key,title,body,created_at) SELECT lower(hex(randomblob(16))),m.user_id,'request_comment','service_request',?,'request-comment:'||?||':'||m.user_id,?,?,? FROM organization_memberships m JOIN departments d ON d.id=m.department_id WHERE d.code=? AND d.organization='NIC' AND d.accepts_requests=1 AND m.status='active' AND m.user_id<>? ON CONFLICT(dedupe_key) DO NOTHING").bind(id, commentId, noticeTitle, message.slice(0, 240), now, item.targetDepartment, user.id));
    }
    await db.batch(statements);
    return Response.json({ comment: { id: commentId, authorId: user.id, authorName: user.fullName, authorRole: user.role, body: message, createdAt: now } }, { status: 201 });
  }

  if (body?.action === "cancel") {
    if (item.ownerId !== user.id || item.organization !== user.organization) return Response.json({ error: "CANCELLATION_FORBIDDEN" }, { status: 403 });
    if (!canCustomerCancelRequest(item.status)) return Response.json({ error: "CANCELLATION_NOT_ALLOWED" }, { status: 409 });
    const update = await db.prepare("UPDATE service_requests SET status='cancelled',updated_at=? WHERE id=? AND owner_id=? AND organization=? AND status=?").bind(now, id, user.id, user.organization, item.status).run();
    if (!update.meta.changes) return Response.json({ error: "REQUEST_CHANGED" }, { status: 409 });
    await db.batch([
      db.prepare("INSERT INTO audit_logs (id,actor_id,action,entity_type,entity_id,metadata,created_at) VALUES (?,?,?,?,?,?,?)").bind(crypto.randomUUID(), user.id, "request.cancelled_by_customer", "service_request", id, JSON.stringify({ fromStatus: item.status, toStatus: "cancelled" }), now),
      db.prepare("INSERT INTO notifications (id,recipient_id,type,entity_type,entity_id,dedupe_key,title,body,created_at) SELECT lower(hex(randomblob(16))),m.user_id,'request_cancelled','service_request',?,'request-cancelled:'||?||':'||m.user_id,?,?,? FROM organization_memberships m JOIN departments d ON d.id=m.department_id WHERE d.code=? AND d.organization='NIC' AND d.accepts_requests=1 AND m.status='active' AND m.user_id<>? ON CONFLICT(dedupe_key) DO NOTHING").bind(id, id, `Yêu cầu đã được hủy · ${item.title}`, user.fullName, now, item.targetDepartment, user.id),
    ]);
    return Response.json({ request: { id, status: "cancelled", updatedAt: now } });
  }

  return Response.json({ error: "ACTION_INVALID" }, { status: 400 });
}
