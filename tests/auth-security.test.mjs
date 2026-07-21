import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { pbkdf2Sync } from "node:crypto";
import test from "node:test";

test("database schema stores password derivation data instead of plaintext passwords", async () => {
  const schema = await readFile(new URL("../db/schema.ts", import.meta.url), "utf8");
  assert.match(schema, /passwordHash/);
  assert.match(schema, /passwordSalt/);
  assert.match(schema, /passwordIterations/);
  assert.doesNotMatch(schema, /password:\s*text/);
});

test("seed account hash matches the documented demo password", async () => {
  const migration = await readFile(new URL("../drizzle/0000_round_wrecker.sql", import.meta.url), "utf8");
  assert.match(migration, /thanh@demo\.nic\.vn/);
  assert.equal(pbkdf2Sync("Demo@12345", Buffer.from("UZ9cM6ihl20HzLKw7olQqA==", "base64"), 210000, 32, "sha256").toString("base64"), "HRmOebKvkWNFHk/nYtVLHbblPFDG01IwS09B/PZq7RM=");
  assert.doesNotMatch(migration, /'Demo@12345'/);
});

test("session cookie is server-only and service drafts derive ownership from session", async () => {
  const auth = await readFile(new URL("../lib/d1-auth.ts", import.meta.url), "utf8");
  const drafts = await readFile(new URL("../app/api/service-drafts/route.ts", import.meta.url), "utf8");
  assert.match(auth, /HttpOnly/);
  assert.match(auth, /SameSite=Lax/);
  assert.match(auth, /SHA-256/);
  assert.match(drafts, /currentUser\(request\)/);
  assert.doesNotMatch(drafts, /body\?\.ownerId/);
});

test("submit requires current confirmation, ownership and idempotency", async () => {
  const submit = await readFile(new URL("../app/api/service-drafts/[id]/submit/route.ts", import.meta.url), "utf8");
  const confirm = await readFile(new URL("../app/api/service-drafts/[id]/confirm/route.ts", import.meta.url), "utf8");
  const update = await readFile(new URL("../app/api/service-drafts/[id]/route.ts", import.meta.url), "utf8");
  assert.match(submit, /idempotency-key/);
  assert.match(submit, /confirmed_version = d\.version/);
  assert.match(submit, /d\.owner_id = \?/);
  assert.match(confirm, /owner_id = \?/);
  assert.match(update, /confirmed_version = NULL/);
  assert.match(update, /version = version \+ 1/);
});

test("official request reads remain tenant and owner scoped", async () => {
  const requests = await readFile(new URL("../app/api/requests/route.ts", import.meta.url), "utf8");
  const page = await readFile(new URL("../app/portal/requests/page.tsx", import.meta.url), "utf8");
  const portal = await readFile(new URL("../app/components/RequestsPortal.tsx", import.meta.url), "utf8");
  assert.match(requests, /owner_id = \?/);
  assert.match(requests, /organization = \?/);
  assert.match(requests, /user\.organization/);
  assert.match(requests, /target_department = \?/);
  assert.match(requests, /request:read:assigned_team/);
  assert.match(requests, /details/);
  assert.match(page, /RequestsPortal/);
  assert.match(portal, /fetch\("\/api\/requests"/);
  assert.match(portal, /Xem chi tiết/);
  assert.doesNotMatch(portal, /PATCH|request:update_status/);
});

test("request collaboration enforces scoped reads, CSRF, rate limit and audited cancellation", async () => {
  const route = await readFile(new URL("../app/api/requests/[id]/route.ts", import.meta.url), "utf8");
  const scope = await readFile(new URL("../lib/request-scope.ts", import.meta.url), "utf8");
  const migration = await readFile(new URL("../drizzle/0011_request_collaboration.sql", import.meta.url), "utf8");
  assert.match(route, /currentUser\(request\)/);
  assert.match(route, /requireCsrf\(request\)/);
  assert.match(route, /enforceRateLimit/);
  assert.match(route, /item\.ownerId === user\.id/);
  assert.match(scope, /request:read:organization/);
  assert.match(scope, /request:read:assigned_team/);
  assert.match(route, /canCommentRequest/);
  assert.match(route, /COMMENT_FORBIDDEN/);
  assert.match(route, /request\.comment_added/);
  assert.match(route, /request\.cancelled_by_customer/);
  assert.match(route, /canCustomerCancelRequest/);
  assert.match(route, /recipient_id/);
  assert.match(migration, /request_comments/);
  assert.match(migration, /REFERENCES `service_requests`/);
});

test("request attachments use private R2 with validation, scoped download and audit", async () => {
  const upload = await readFile(new URL("../app/api/requests/[id]/attachments/route.ts", import.meta.url), "utf8");
  const download = await readFile(new URL("../app/api/requests/[id]/attachments/[attachmentId]/route.ts", import.meta.url), "utf8");
  const migration = await readFile(new URL("../drizzle/0012_request_attachments.sql", import.meta.url), "utf8");
  const rls = await readFile(new URL("../supabase/migrations/202607210013_request_attachments.sql", import.meta.url), "utf8");
  assert.match(upload,/requireCsrf\(request\)/);
  assert.match(upload,/enforceRateLimit/);
  assert.match(upload,/validateAttachment/);
  assert.match(upload,/storage\.delete\(objectKey\)/);
  assert.match(upload,/request\.attachment_uploaded/);
  assert.match(download,/canReadRequest\(user, item\)/);
  assert.match(download,/Cache-Control": "private, no-store/);
  assert.match(download,/X-Content-Type-Options": "nosniff/);
  assert.match(download,/Content-Security-Policy": "sandbox/);
  assert.match(migration,/REFERENCES `service_requests`/);
  assert.match(migration,/CHECK \(`size_bytes` BETWEEN 1 AND 8388608\)/);
  assert.match(rls,/alter table public\.request_attachments force row level security/);
  assert.match(rls,/can_read_service_request/);
  assert.match(rls,/revoke insert,update,delete on public\.request_attachments from anon,authenticated/);
});

test("Supabase request collaboration forces tenant RLS and keeps client writes revoked", async () => {
  const migration = await readFile(new URL("../supabase/migrations/202607210012_request_collaboration.sql", import.meta.url), "utf8");
  for (const table of ["service_requests", "request_comments"]) {
    assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`));
    assert.match(migration, new RegExp(`alter table public\\.${table} force row level security`));
  }
  assert.match(migration, /request_owner = \(select auth\.uid\(\)\)/);
  assert.match(migration, /membership\.organization_id = request_organization/);
  assert.match(migration, /request_department = 'service_desk'/);
  assert.match(migration, /request_department = 'facility'/);
  assert.match(migration, /request_department = 'event'/);
  assert.match(migration, /request_department = 'security'/);
  assert.match(migration, /request\.id = request_id/);
  assert.match(migration, /revoke insert,update,delete on public\.service_requests,public\.request_comments from anon,authenticated/);
});

test("ERP roles grant capabilities instead of trusting UI role labels", async () => {
  const access = await readFile(new URL("../lib/access-control.ts", import.meta.url), "utf8");
  const auth = await readFile(new URL("../lib/d1-auth.ts", import.meta.url), "utf8");
  for (const role of ["customer_member", "customer_admin", "service_desk", "facility_staff", "facility_manager", "event_staff", "security_staff", "system_admin", "auditor"]) assert.match(access, new RegExp(`${role}:`));
  assert.match(access, /request:read:assigned_team/);
  assert.match(access, /organization:manage_members/);
  assert.match(auth, /organization_memberships/);
  assert.match(auth, /capabilitiesFor/);
  assert.match(access, /booking:manage/);
  assert.match(access, /work_order:manage/);
});

test("operations writes enforce capability, team scope, CSRF and audit", async () => {
  const requestRoute = await readFile(new URL("../app/api/operations/requests/[id]/route.ts", import.meta.url), "utf8");
  const bookingRoute = await readFile(new URL("../app/api/bookings/route.ts", import.meta.url), "utf8");
  const workOrderRoute = await readFile(new URL("../app/api/work-orders/route.ts", import.meta.url), "utf8");
  for (const route of [requestRoute, bookingRoute, workOrderRoute]) {
    assert.match(route, /requireCsrf\(request\)/);
    assert.match(route, /enforceRateLimit/);
    assert.match(route, /audit_logs/);
  }
  assert.match(requestRoute, /target_department = \?/);
  assert.match(bookingRoute, /NOT EXISTS/);
  assert.doesNotMatch(bookingRoute, /body\?\.requesterId/);
  assert.match(workOrderRoute, /target_department='facility'/);
});

test("write routes require CSRF and distributed rate limits", async () => {
  const auth = await readFile(new URL("../lib/d1-auth.ts", import.meta.url), "utf8");
  const createDraft = await readFile(new URL("../app/api/service-drafts/route.ts", import.meta.url), "utf8");
  const revoke = await readFile(new URL("../app/api/auth/revoke-all/route.ts", import.meta.url), "utf8");
  assert.match(auth, /x-csrf-token/);
  assert.match(auth, /csrf_hash/);
  assert.match(auth, /ON CONFLICT\(bucket_key\)/);
  assert.match(createDraft, /requireCsrf\(request\)/);
  assert.match(createDraft, /enforceRateLimit/);
  assert.match(revoke, /DELETE FROM sessions WHERE user_id = \?/);
  assert.match(revoke, /session\.revoked_all/);
});

test("common services expose dedicated registration fields", async () => {
  const workspace = await readFile(new URL("../app/components/ConciergeWorkspace.tsx", import.meta.url), "utf8");
  const styles = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  const createDraftSource = workspace.slice(workspace.indexOf("async function createDraft"), workspace.indexOf("async function confirmDraft"));
  for (const serviceType of ["space_booking", "support", "event_registration", "access_card"]) assert.match(workspace, new RegExp(`${serviceType}:`));
  for (const field of ["Ngày sử dụng", "Nhóm hỗ trợ", "Ngày tham dự", "Loại yêu cầu"]) assert.match(workspace, new RegExp(field));
  assert.match(workspace, /ServiceRegistrationFields service=\{selectedService\}/);
  assert.match(workspace, /structuredDetails\.join\("\\n"\)/);
  assert.match(workspace, /const formElement = event\.currentTarget/);
  assert.match(workspace, /formElement\.reset\(\)/);
  assert.doesNotMatch(createDraftSource, /event\.currentTarget\.reset\(\)/);
  assert.match(styles, /form>div\.service-form-grid\{display:grid/);
  assert.match(styles, /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
});

test("public home routes authentication and portal navigation explicitly", async () => {
  const home = await readFile(new URL("../app/components/PublicHome.tsx", import.meta.url), "utf8");
  const portal = await readFile(new URL("../app/components/PortalHeader.tsx", import.meta.url), "utf8");
  assert.match(home, /href="\/auth"/);
  assert.match(home, /href="\/auth\?mode=register"/);
  for (const route of ["/portal/requests", "/portal/bookings", "/portal/help"]) assert.match(portal, new RegExp(route));
});

test("Copilot remains authenticated and has no submit capability", async () => {
  const route = await readFile(new URL("../app/api/copilot/route.ts", import.meta.url), "utf8");
  assert.match(route, /currentUser\(request\)/);
  assert.match(route, /suggestedService/);
  assert.match(route, /gemini-2\.5-flash/);
  assert.match(route, /:generateContent/);
  assert.match(route, /GEMINI_API_KEY/);
  assert.match(route, /history\.slice\(-8\)/);
  assert.match(route, /responseJsonSchema/);
  assert.match(route, /localUnderstanding/);
  assert.match(route, /knowledge_documents WHERE status='active'/);
  assert.match(route, /SELECT name,location,capacity FROM spaces/);
  assert.match(route, /allowedSources/);
  assert.doesNotMatch(route, /submit_request|service_requests|INSERT INTO/);
});

test("diagnostics are privileged and support exact source frames", async () => {
  const route = await readFile(new URL("../app/api/diagnostics/route.ts", import.meta.url), "utf8");
  const worker = await readFile(new URL("../worker/index.ts", import.meta.url), "utf8");
  assert.match(route, /platform:manage/);
  assert.match(route, /user\.role !== "auditor"/);
  assert.match(route, /WHERE correlation_id=\?/);
  assert.match(worker, /recordDiagnostic/);
  assert.match(worker, /diagnosticId/);
});

test("confirmed support submission creates an audited triage work order", async () => {
  const route = await readFile(new URL("../app/api/service-drafts/[id]/submit/route.ts", import.meta.url), "utf8");
  assert.match(route, /confirmed_version = d\.version/);
  assert.match(route, /serviceType === "support"/);
  assert.match(route, /INSERT INTO maintenance_work_orders/);
  assert.match(route, /work_order\.auto_created/);
  assert.match(route, /db\.batch\(statements\)/);
});

test("enterprise login uses OIDC code flow, PKCE, nonce, signature validation and MFA",async()=>{
  const start=await readFile(new URL("../app/api/auth/enterprise/start/route.ts",import.meta.url),"utf8");
  const callback=await readFile(new URL("../app/api/auth/enterprise/callback/route.ts",import.meta.url),"utf8");
  const oidc=await readFile(new URL("../lib/oidc.ts",import.meta.url),"utf8");
  assert.match(start,/code_challenge_method","S256/);
  assert.match(start,/nonce_hash/);
  assert.match(callback,/consumed_at IS NULL/);
  assert.match(callback,/MFA_REQUIRED/);
  assert.match(callback,/email_verified/);
  assert.match(oidc,/RSASSA-PKCS1-v1_5/);
  assert.match(oidc,/claims\.iss/);
  assert.match(oidc,/audience\.includes\(clientId\)/);
  assert.doesNotMatch(callback,/console\.log/);
});

test("P3 routes enforce backend authorization, correlation, redaction and retention dry-run",async()=>{
  const procurement=await readFile(new URL("../app/api/procurement/route.ts",import.meta.url),"utf8");
  const retention=await readFile(new URL("../app/api/cron/retention/route.ts",import.meta.url),"utf8");
  const observability=await readFile(new URL("../lib/observability.ts",import.meta.url),"utf8");
  const rls=await readFile(new URL("../supabase/migrations/202607210009_p3_enterprise.sql",import.meta.url),"utf8");
  for(const capability of ["procurement:manage","procurement:approve","procurement:receive","procurement:invoice"])assert.match(procurement,new RegExp(capability));
  assert.match(procurement,/requireCsrf\(request\)/);
  assert.match(procurement,/idempotency-key/);
  assert.match(retention,/dryRun/);
  assert.match(retention,/legal_holds/);
  assert.match(observability,/redactForLog/);
  assert.match(observability,/x-correlation-id/);
  assert.doesNotMatch(observability,/request\.headers\.get\("authorization"\)/);
  for(const table of ["purchase_orders","supplier_invoices","procurement_exceptions"])assert.match(rls,new RegExp(`alter table public\\.${table} force row level security`));
  assert.match(rls,/is_active_provider_member/);
  assert.match(rls,/revoke all on public\.retention_job_runs/);
});

test("coordination portal guards initial data and async form lifetime",async()=>{
  const portal=await readFile(new URL("../app/components/CoordinationPortal.tsx",import.meta.url),"utf8");
  const createSource=portal.slice(portal.indexOf("async function create"),portal.indexOf("async function update"));
  assert.match(portal,/if\(!data\)return <main/);
  assert.match(createSource,/const formElement=event\.currentTarget/);
  assert.match(createSource,/formElement\.reset\(\)/);
  assert.doesNotMatch(createSource,/event\.currentTarget\.reset\(\)/);
  assert.match(createSource,/finally\{setPending\(false\);\}/);
});

test("portal home uses live activity and every portal route shares the authenticated header",async()=>{
  const workspace=await readFile(new URL("../app/components/ConciergeWorkspace.tsx",import.meta.url),"utf8");
  const header=await readFile(new URL("../app/components/PortalHeader.tsx",import.meta.url),"utf8");
  const notifications=await readFile(new URL("../app/api/notifications/route.ts",import.meta.url),"utf8");
  assert.match(workspace,/fetch\("\/api\/requests"/);
  assert.match(workspace,/fetch\("\/api\/bookings"/);
  assert.doesNotMatch(workspace,/Workshop đổi mới sáng tạo|REQ-0712|BKG-0685/);
  for(const route of ["/portal","/portal/requests","/portal/bookings","/portal/coordination","/portal/help"])assert.match(header,new RegExp(route.replaceAll("/","\\/")));
  assert.match(header,/notification-menu/);
  assert.match(header,/aria-label=\{`Thông báo/);
  assert.match(notifications,/currentUser\(request\)/);
  assert.match(notifications,/WHERE recipient_id=\?/);
  assert.match(notifications,/requireCsrf\(request\)/);
  assert.match(notifications,/status='read'.*recipient_id=\?/);
  assert.match(notifications,/mark_read/);
  assert.match(header,/request=\$\{encodeURIComponent\(item\.entityId\)\}/);
  assert.match(header,/openNotification/);
  for(const page of ["bookings","requests","coordination","operations","reliability","portfolio","procurement","diagnostics"]){
    const source=await readFile(new URL(`../app/portal/${page}/page.tsx`,import.meta.url),"utf8");
    assert.match(source,/PortalHeader/);
  }
});
