import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function migratedDatabase() {
  const database = new DatabaseSync(":memory:");
  database.exec("PRAGMA foreign_keys = ON");
  for (const migration of ["0000_round_wrecker.sql", "0001_clumsy_black_crow.sql", "0002_stiff_moon_knight.sql", "0003_erp_access_routing.sql", "0004_brief_rockslide.sql", "0005_coordination_mvp.sql", "0006_coordination_demo_accounts.sql"]) {
    const sql = await readFile(new URL(`../drizzle/${migration}`, import.meta.url), "utf8");
    database.exec(sql.replaceAll("--> statement-breakpoint", ""));
  }
  return database;
}

test("request query isolates two users from two organizations", async () => {
  const database = await migratedDatabase();
  database.prepare("INSERT INTO users (id,email,full_name,organization,role,password_hash,password_salt,password_iterations,failed_attempts,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)").run("tenant-b-user", "member@tenant-b.vn", "Thành viên B", "Tenant B", "tenant_member", "hash", "salt", 210000, 0, 1);
  database.prepare("INSERT INTO service_drafts (id,owner_id,service_type,title,details,status,version,confirmed_version,created_at,updated_at) VALUES (?,?,?,?,?,'submitted',1,1,?,?)").run("draft-a", "demo-tenant-001", "support", "Yêu cầu A", "Chi tiết A", 1, 1);
  database.prepare("INSERT INTO service_drafts (id,owner_id,service_type,title,details,status,version,confirmed_version,created_at,updated_at) VALUES (?,?,?,?,?,'submitted',1,1,?,?)").run("draft-b", "tenant-b-user", "support", "Yêu cầu B", "Chi tiết B", 1, 1);
  database.prepare("INSERT INTO service_requests (id,draft_id,owner_id,organization,service_type,title,details,status,idempotency_key,created_at) VALUES (?,?,?,?,?,?,?,'submitted',?,?)").run("request-a", "draft-a", "demo-tenant-001", "Innovate Vietnam", "support", "Yêu cầu A", "Chi tiết A", "key-a", 1);
  database.prepare("INSERT INTO service_requests (id,draft_id,owner_id,organization,service_type,title,details,status,idempotency_key,created_at) VALUES (?,?,?,?,?,?,?,'submitted',?,?)").run("request-b", "draft-b", "tenant-b-user", "Tenant B", "support", "Yêu cầu B", "Chi tiết B", "key-b", 1);
  const tenantA = database.prepare("SELECT id FROM service_requests WHERE owner_id = ? AND organization = ?").all("demo-tenant-001", "Innovate Vietnam");
  const tenantB = database.prepare("SELECT id FROM service_requests WHERE owner_id = ? AND organization = ?").all("tenant-b-user", "Tenant B");
  assert.deepEqual(tenantA.map(row => row.id), ["request-a"]);
  assert.deepEqual(tenantB.map(row => row.id), ["request-b"]);
  assert.equal(database.prepare("SELECT count(*) AS count FROM service_requests WHERE owner_id = ? AND organization = ?").get("demo-tenant-001", "Tenant B").count, 0);
});

test("idempotency key is unique per owner", async () => {
  const database = await migratedDatabase();
  const indexes = database.prepare("PRAGMA index_list('service_requests')").all();
  assert.ok(indexes.some(index => index.name === "service_requests_owner_idempotency_idx" && index.unique === 1));
});

test("membership and request routing schema support cross-team ERP work", async () => {
  const database = await migratedDatabase();
  assert.ok(database.prepare("PRAGMA table_info('service_requests')").all().some(column => column.name === "target_department"));
  assert.ok(database.prepare("PRAGMA table_info('organization_memberships')").all().some(column => column.name === "role"));
  const membership = database.prepare("SELECT role FROM organization_memberships WHERE user_id = ?").get("demo-tenant-001");
  assert.equal(membership.role, "customer_admin");
});

test("booking insert rejects overlapping confirmed windows", async () => {
  const database = await migratedDatabase();
  const insert = database.prepare("INSERT INTO bookings (id,requester_id,organization,space_id,title,attendee_count,starts_at,ends_at,status,notes,created_at,updated_at) SELECT ?,?,?,?,?,?,?,?,'confirmed','',1,1 FROM spaces s WHERE s.id=? AND s.capacity>=? AND NOT EXISTS (SELECT 1 FROM bookings b WHERE b.space_id=s.id AND b.status='confirmed' AND b.starts_at < ? AND b.ends_at > ?)");
  assert.equal(insert.run("booking-a","demo-tenant-001","Innovate Vietnam","space-meeting-32","Họp A",8,2000,3000,"space-meeting-32",8,3000,2000).changes,1);
  assert.equal(insert.run("booking-b","demo-tenant-001","Innovate Vietnam","space-meeting-32","Họp B",6,2500,3500,"space-meeting-32",6,3500,2500).changes,0);
  assert.equal(insert.run("booking-c","demo-tenant-001","Innovate Vietnam","space-meeting-32","Họp C",6,3000,3600,"space-meeting-32",6,3600,3000).changes,1);
});

test("only one active maintenance work order is allowed per request", async () => {
  const database = await migratedDatabase();
  database.prepare("INSERT INTO service_drafts (id,owner_id,service_type,title,details,status,version,confirmed_version,created_at,updated_at) VALUES ('wo-draft','demo-tenant-001','support','Sửa điều hòa','Nóng','submitted',1,1,1,1)").run();
  database.prepare("INSERT INTO service_requests (id,draft_id,owner_id,organization,service_type,title,details,status,target_department,requester_role,visibility,idempotency_key,created_at,updated_at) VALUES ('wo-request','wo-draft','demo-tenant-001','Innovate Vietnam','support','Sửa điều hòa','Nóng','in_progress','facility','customer_admin','organization','wo-key',1,1)").run();
  const create = database.prepare("INSERT INTO maintenance_work_orders (id,request_id,title,location,priority,status,created_by,created_at,updated_at) VALUES (?,?,?,?,?,'open',?,?,?)");
  create.run("wo-a","wo-request","Kiểm tra điều hòa","Tầng 3","high","demo-facility-001",1,1);
  assert.throws(()=>create.run("wo-b","wo-request","Kiểm tra lần hai","Tầng 3","normal","demo-facility-001",1,1),/UNIQUE/);
});

test("coordination migration supports visitors, providers and catering orders", async () => {
  const database = await migratedDatabase();
  const tables = database.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(row=>row.name);
  assert.ok(tables.includes("visitor_registrations"));
  assert.ok(tables.includes("service_providers"));
  assert.ok(tables.includes("event_service_orders"));
  assert.ok(database.prepare("PRAGMA table_info('maintenance_work_orders')").all().some(column=>column.name==="provider_id"));
  assert.ok(database.prepare("SELECT id FROM service_providers WHERE service_types LIKE '%catering%'").get());
});
