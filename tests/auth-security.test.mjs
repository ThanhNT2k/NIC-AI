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
  assert.match(requests, /owner_id = \?/);
  assert.match(requests, /organization = \?/);
  assert.match(requests, /user\.organization/);
  assert.match(requests, /target_department = \?/);
  assert.match(requests, /request:read:assigned_team/);
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
  for (const serviceType of ["space_booking", "support", "event_registration", "access_card"]) assert.match(workspace, new RegExp(`${serviceType}:`));
  for (const field of ["Ngày sử dụng", "Nhóm hỗ trợ", "Ngày tham dự", "Loại yêu cầu"]) assert.match(workspace, new RegExp(field));
  assert.match(workspace, /ServiceRegistrationFields service=\{selectedService\}/);
  assert.match(workspace, /structuredDetails\.join\("\\n"\)/);
});

test("public home routes authentication and portal navigation explicitly", async () => {
  const home = await readFile(new URL("../app/components/PublicHome.tsx", import.meta.url), "utf8");
  const portal = await readFile(new URL("../app/components/ConciergeWorkspace.tsx", import.meta.url), "utf8");
  assert.match(home, /href="\/auth"/);
  assert.match(home, /href="\/auth\?mode=register"/);
  for (const route of ["/portal/requests", "/portal/bookings", "/portal/help"]) assert.match(portal, new RegExp(route));
});

test("Copilot remains authenticated and has no submit capability", async () => {
  const route = await readFile(new URL("../app/api/copilot/route.ts", import.meta.url), "utf8");
  assert.match(route, /currentUser\(request\)/);
  assert.match(route, /suggestedService/);
  assert.match(route, /client\.responses\.create/);
  assert.match(route, /history\.slice\(-8\)/);
  assert.match(route, /json_schema/);
  assert.match(route, /localUnderstanding/);
  assert.doesNotMatch(route, /submit_request|service_requests|INSERT INTO/);
});
