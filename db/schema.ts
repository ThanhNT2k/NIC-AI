import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  fullName: text("full_name").notNull(),
  organization: text("organization").notNull(),
  role: text("role").notNull().default("tenant_member"),
  passwordHash: text("password_hash").notNull(),
  passwordSalt: text("password_salt").notNull(),
  passwordIterations: integer("password_iterations").notNull().default(210000),
  failedAttempts: integer("failed_attempts").notNull().default(0),
  lockedUntil: integer("locked_until"),
  createdAt: integer("created_at").notNull(),
});

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  csrfHash: text("csrf_hash").notNull(),
  expiresAt: integer("expires_at").notNull(),
  createdAt: integer("created_at").notNull(),
});

export const rateLimits = sqliteTable("rate_limits", {
  bucketKey: text("bucket_key").primaryKey(),
  windowStart: integer("window_start").notNull(),
  count: integer("count").notNull().default(1),
  expiresAt: integer("expires_at").notNull(),
});

export const departments = sqliteTable("departments", {
  id: text("id").primaryKey(),
  organization: text("organization").notNull(),
  code: text("code").notNull(),
  name: text("name").notNull(),
  acceptsRequests: integer("accepts_requests").notNull().default(1),
}, (table) => [uniqueIndex("departments_org_code_unique").on(table.organization, table.code)]);

export const organizationMemberships = sqliteTable("organization_memberships", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  organization: text("organization").notNull(),
  departmentId: text("department_id").references(() => departments.id),
  role: text("role").notNull().default("customer_member"),
  status: text("status").notNull().default("active"),
  createdAt: integer("created_at").notNull(),
}, (table) => [uniqueIndex("memberships_user_org_unique").on(table.userId, table.organization)]);

export const serviceDrafts = sqliteTable("service_drafts", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  serviceType: text("service_type").notNull(),
  title: text("title").notNull(),
  details: text("details").notNull(),
  status: text("status").notNull().default("draft"),
  version: integer("version").notNull().default(1),
  confirmedVersion: integer("confirmed_version"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const serviceRequests = sqliteTable("service_requests", {
  id: text("id").primaryKey(),
  draftId: text("draft_id").notNull().unique().references(() => serviceDrafts.id),
  ownerId: text("owner_id").notNull().references(() => users.id),
  organization: text("organization").notNull(),
  serviceType: text("service_type").notNull(),
  title: text("title").notNull(),
  details: text("details").notNull(),
  status: text("status").notNull().default("submitted"),
  targetDepartment: text("target_department").notNull().default("service_desk"),
  requesterRole: text("requester_role").notNull().default("customer_member"),
  assignedTo: text("assigned_to").references(() => users.id),
  visibility: text("visibility").notNull().default("organization"),
  idempotencyKey: text("idempotency_key").notNull(),
  createdAt: integer("created_at").notNull(),
}, (table) => [uniqueIndex("service_requests_owner_idempotency_idx").on(table.ownerId, table.idempotencyKey)]);

export const auditLogs = sqliteTable("audit_logs", {
  id: text("id").primaryKey(),
  actorId: text("actor_id").notNull().references(() => users.id),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  metadata: text("metadata").notNull().default("{}"),
  createdAt: integer("created_at").notNull(),
});
