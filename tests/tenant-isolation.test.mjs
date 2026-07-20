import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function migratedDatabase() {
  const database = new DatabaseSync(":memory:");
  database.exec("PRAGMA foreign_keys = ON");
  for (const migration of ["0000_round_wrecker.sql", "0001_clumsy_black_crow.sql", "0002_stiff_moon_knight.sql"]) {
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
