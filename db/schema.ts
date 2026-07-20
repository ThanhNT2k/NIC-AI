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
  updatedAt: integer("updated_at"),
}, (table) => [uniqueIndex("service_requests_owner_idempotency_idx").on(table.ownerId, table.idempotencyKey)]);

export const spaces = sqliteTable("spaces", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  location: text("location").notNull(),
  capacity: integer("capacity").notNull(),
  equipment: text("equipment").notNull().default(""),
  status: text("status").notNull().default("active"),
});

export const bookings = sqliteTable("bookings", {
  id: text("id").primaryKey(),
  requestId: text("request_id").references(() => serviceRequests.id),
  requesterId: text("requester_id").notNull().references(() => users.id),
  organization: text("organization").notNull(),
  spaceId: text("space_id").notNull().references(() => spaces.id),
  title: text("title").notNull(),
  attendeeCount: integer("attendee_count").notNull(),
  startsAt: integer("starts_at").notNull(),
  endsAt: integer("ends_at").notNull(),
  status: text("status").notNull().default("confirmed"),
  notes: text("notes").notNull().default(""),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const serviceProviders = sqliteTable("service_providers", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  serviceTypes: text("service_types").notNull(),
  contactName: text("contact_name").notNull(),
  contactPhone: text("contact_phone").notNull(),
  status: text("status").notNull().default("active"),
});

export const maintenanceWorkOrders = sqliteTable("maintenance_work_orders", {
  id: text("id").primaryKey(),
  requestId: text("request_id").notNull().references(() => serviceRequests.id),
  title: text("title").notNull(),
  location: text("location").notNull(),
  priority: text("priority").notNull().default("normal"),
  status: text("status").notNull().default("open"),
  assignedTo: text("assigned_to").references(() => users.id),
  providerId: text("provider_id").references(() => serviceProviders.id),
  scheduledAt: integer("scheduled_at"),
  resolution: text("resolution").notNull().default(""),
  createdBy: text("created_by").notNull().references(() => users.id),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const visitorRegistrations = sqliteTable("visitor_registrations", {
  id: text("id").primaryKey(),
  requesterId: text("requester_id").notNull().references(() => users.id),
  organization: text("organization").notNull(),
  visitorName: text("visitor_name").notNull(),
  visitorPhone: text("visitor_phone").notNull(),
  hostName: text("host_name").notNull(),
  visitAt: integer("visit_at").notNull(),
  purpose: text("purpose").notNull(),
  status: text("status").notNull().default("pending"),
  badgeCode: text("badge_code").notNull().unique(),
  checkedInAt: integer("checked_in_at"),
  checkedOutAt: integer("checked_out_at"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const eventServiceOrders = sqliteTable("event_service_orders", {
  id: text("id").primaryKey(),
  requesterId: text("requester_id").notNull().references(() => users.id),
  organization: text("organization").notNull(),
  eventName: text("event_name").notNull(),
  eventAt: integer("event_at").notNull(),
  attendeeCount: integer("attendee_count").notNull(),
  cateringPackage: text("catering_package").notNull(),
  servings: integer("servings").notNull(),
  logisticsNotes: text("logistics_notes").notNull().default(""),
  providerId: text("provider_id").references(() => serviceProviders.id),
  status: text("status").notNull().default("requested"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const auditLogs = sqliteTable("audit_logs", {
  id: text("id").primaryKey(),
  actorId: text("actor_id").notNull().references(() => users.id),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  metadata: text("metadata").notNull().default("{}"),
  createdAt: integer("created_at").notNull(),
});
