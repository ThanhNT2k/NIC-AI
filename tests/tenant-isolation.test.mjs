import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function migratedDatabase() {
  const database = new DatabaseSync(":memory:");
  database.exec("PRAGMA foreign_keys = ON");
  for (const migration of ["0000_round_wrecker.sql", "0001_clumsy_black_crow.sql", "0002_stiff_moon_knight.sql", "0003_erp_access_routing.sql", "0004_brief_rockslide.sql", "0005_coordination_mvp.sql", "0006_coordination_demo_accounts.sql", "0007_p1_operational_reliability.sql", "0008_p2_operational_portfolio.sql"]) {
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

test("P1 operational schema enforces anti-overlap and segregation of duties", async()=>{
  const database=await migratedDatabase();
  const tables=database.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(row=>row.name);
  for(const name of ["operation_templates","work_order_tasks","sla_instances","sla_job_events","resource_profiles","resource_bookings","provider_assignments","access_reviews","configuration_changes"]) assert.ok(tables.includes(name),name);
  database.prepare("INSERT INTO service_drafts (id,owner_id,service_type,title,details,status,version,confirmed_version,created_at,updated_at) VALUES ('p1-draft','demo-tenant-001','support','P1','P1','submitted',1,1,1,1)").run();
  database.prepare("INSERT INTO service_requests (id,draft_id,owner_id,organization,service_type,title,details,status,target_department,requester_role,visibility,idempotency_key,created_at,updated_at) VALUES ('p1-request','p1-draft','demo-tenant-001','Innovate Vietnam','support','P1','P1','in_progress','facility','customer_admin','organization','p1-key',1,1)").run();
  database.prepare("INSERT INTO maintenance_work_orders (id,request_id,title,location,priority,status,created_by,created_at,updated_at) VALUES ('p1-wo','p1-request','P1','NIC','high','open','demo-facility-001',1,1)").run();
  database.prepare("INSERT INTO resource_profiles (id,user_id,location,working_windows,status) VALUES ('resource-1','demo-facility-001','NIC','[]','active')").run();
  database.prepare("INSERT INTO resource_bookings (id,resource_id,work_order_id,starts_at,ends_at,status,created_at) VALUES ('rb-1','resource-1','p1-wo',100,200,'confirmed',1)").run();
  assert.throws(()=>database.prepare("INSERT INTO resource_bookings (id,resource_id,work_order_id,starts_at,ends_at,status,created_at) VALUES ('rb-2','resource-1','p1-wo',150,250,'confirmed',1)").run(),/RESOURCE_BOOKING_OVERLAP/);
  assert.throws(()=>database.prepare("INSERT INTO configuration_changes (id,entity_type,entity_id,payload,reason,maker_id,status,checker_id,created_at) VALUES ('change-1','role','x','{}','test','demo-facility-001','approved','demo-facility-001',1)").run(),/CHECK/);
  assert.equal(database.prepare("SELECT status FROM operation_templates WHERE id='template-support-v1'").get().status,"active");
  assert.equal(database.prepare("SELECT count(*) AS count FROM operation_template_tasks WHERE template_id='template-support-v1'").get().count,3);
  assert.equal(database.prepare("SELECT role FROM users WHERE id='demo-system-admin-001'").get().role,"system_admin");
  assert.equal(database.prepare("SELECT provider_id AS providerId FROM provider_memberships WHERE user_id='demo-provider-001'").get().providerId,"provider-building-mvp");
  assert.ok(tables.includes("notifications"));
});

test("provider response history versions and notification dedupe are unique",async()=>{
  const database=await migratedDatabase();
  database.prepare("INSERT INTO service_drafts (id,owner_id,service_type,title,details,status,version,confirmed_version,created_at,updated_at) VALUES ('provider-draft','demo-tenant-001','support','Provider','Provider','submitted',1,1,1,1)").run();
  database.prepare("INSERT INTO service_requests (id,draft_id,owner_id,organization,service_type,title,details,status,target_department,requester_role,visibility,idempotency_key,created_at,updated_at) VALUES ('provider-request','provider-draft','demo-tenant-001','Innovate Vietnam','support','Provider','Provider','in_progress','facility','customer_admin','organization','provider-key',1,1)").run();
  database.prepare("INSERT INTO maintenance_work_orders (id,request_id,title,location,priority,status,provider_id,created_by,created_at,updated_at) VALUES ('provider-wo','provider-request','Provider WO','NIC','high','open','provider-building-mvp','demo-facility-001',1,1)").run();
  database.prepare("INSERT INTO provider_assignments (id,work_order_id,provider_id,version,status,response_deadline) VALUES ('assignment-1','provider-wo','provider-building-mvp',1,'awaiting_provider',100)").run();
  database.prepare("INSERT INTO provider_assignment_responses (id,assignment_id,version,response,note,actor_id,created_at) VALUES ('response-1','assignment-1',2,'accept','ok','demo-provider-001',1)").run();
  assert.throws(()=>database.prepare("INSERT INTO provider_assignment_responses (id,assignment_id,version,response,note,actor_id,created_at) VALUES ('response-2','assignment-1',2,'reject','duplicate','demo-provider-001',2)").run(),/UNIQUE/);
  database.prepare("INSERT INTO notifications (id,recipient_id,type,entity_type,entity_id,dedupe_key,title,body,created_at) VALUES ('notice-1','demo-provider-001','provider_assignment','provider_assignment','assignment-1','dedupe-1','New','Body',1)").run();
  assert.throws(()=>database.prepare("INSERT INTO notifications (id,recipient_id,type,entity_type,entity_id,dedupe_key,title,body,created_at) VALUES ('notice-2','demo-provider-001','provider_assignment','provider_assignment','assignment-1','dedupe-1','New','Body',1)").run(),/UNIQUE/);
});

test("P2 schema protects cost snapshots, QR replay and maker-checker",async()=>{
  const database=await migratedDatabase();
  const tables=database.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(row=>row.name);
  for(const name of ["assets","maintenance_plans","maintenance_plan_runs","work_order_cost_lines","event_templates","event_checklist_tasks","event_budget_approvals","visitor_qr_tokens","badge_print_jobs","visitor_access_grants","master_data_records"])assert.ok(tables.includes(name),name);
  assert.equal(database.prepare("SELECT parent_asset_id AS parentAssetId FROM assets WHERE id='asset-hvac-demo'").get().parentAssetId,null);
  assert.equal(database.prepare("SELECT recurrence_days AS days FROM maintenance_plans WHERE id='plan-hvac-demo'").get().days,90);
  database.prepare("INSERT INTO service_drafts (id,owner_id,service_type,title,details,status,version,confirmed_version,created_at,updated_at) VALUES ('p2-draft','demo-tenant-001','support','P2','P2','submitted',1,1,1,1)").run();
  database.prepare("INSERT INTO service_requests (id,draft_id,owner_id,organization,service_type,title,details,status,target_department,requester_role,visibility,idempotency_key,created_at,updated_at) VALUES ('p2-request','p2-draft','demo-tenant-001','Innovate Vietnam','support','P2','P2','in_progress','facility','customer_admin','organization','p2-key',1,1)").run();
  database.prepare("INSERT INTO maintenance_work_orders (id,request_id,title,location,priority,status,asset_id,created_by,created_at,updated_at) VALUES ('p2-wo','p2-request','P2','NIC','normal','open','asset-hvac-demo','demo-facility-001',1,1)").run();
  database.prepare("INSERT INTO work_order_cost_lines (id,work_order_id,line_type,phase,description,quantity_milli,unit,unit_price_minor,tax_bps,discount_bps,subtotal_minor,discount_minor,tax_minor,line_total_minor,currency,created_by,created_at) VALUES ('cost-1','p2-wo','material','estimate','Filter',1000,'cái',10000,1000,0,10000,0,1000,11000,'VND','demo-facility-001',1)").run();
  assert.throws(()=>database.prepare("UPDATE work_order_cost_lines SET unit_price_minor=1 WHERE id='cost-1'").run(),/COST_SNAPSHOT_IMMUTABLE/);
  database.prepare("INSERT INTO visitor_registrations (id,requester_id,organization,visitor_name,visitor_phone,host_name,visit_at,purpose,status,badge_code,created_at,updated_at) VALUES ('visitor-p2','demo-tenant-001','Innovate Vietnam','Khách P2','0900000000','Host',1000,'Test','approved','BADGE-P2',1,1)").run();
  database.prepare("INSERT INTO visitor_qr_tokens (id,visitor_id,token_hash,expires_at,created_by,created_at) VALUES ('qr-p2','visitor-p2','hash-p2',2000,'demo-security-001',1)").run();
  database.prepare("UPDATE visitor_qr_tokens SET redeemed_at=100,redeemed_by='demo-security-001' WHERE id='qr-p2'").run();
  assert.throws(()=>database.prepare("UPDATE visitor_qr_tokens SET redeemed_at=101 WHERE id='qr-p2'").run(),/QR_ALREADY_REDEEMED/);
  assert.throws(()=>database.prepare("INSERT INTO master_data_records (id,entity_type,record_key,version,status,owner_id,effective_from,payload,reason,maker_id,checker_id,created_at) VALUES ('md-self','cost_catalog','SELF',1,'approved','demo-system-admin-001',1,'{}','test','demo-system-admin-001','demo-system-admin-001',1)").run(),/CHECK/);
});
