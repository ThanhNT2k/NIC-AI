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

export const operationTemplates = sqliteTable("operation_templates", {
  id: text("id").primaryKey(), serviceType: text("service_type").notNull(), name: text("name").notNull(), version: integer("version").notNull().default(1), status: text("status").notNull().default("draft"), createdBy: text("created_by").notNull().references(() => users.id), createdAt: integer("created_at").notNull(),
});
export const operationTemplateTasks = sqliteTable("operation_template_tasks", {
  id: text("id").primaryKey(), templateId: text("template_id").notNull().references(() => operationTemplates.id, { onDelete: "cascade" }), sequence: integer("sequence").notNull(), title: text("title").notNull(), required: integer("required").notNull().default(1), estimatedMinutes: integer("estimated_minutes").notNull().default(0), requiredSkill: text("required_skill"), requiredMaterials: text("required_materials").notNull().default("[]"),
});
export const workOrderTasks = sqliteTable("work_order_tasks", {
  id: text("id").primaryKey(), workOrderId: text("work_order_id").notNull().references(() => maintenanceWorkOrders.id, { onDelete: "cascade" }), templateTaskId: text("template_task_id").references(() => operationTemplateTasks.id), sequence: integer("sequence").notNull(), title: text("title").notNull(), required: integer("required").notNull().default(1), status: text("status").notNull().default("pending"), completedBy: text("completed_by").references(() => users.id), completedAt: integer("completed_at"), updatedAt: integer("updated_at").notNull(),
});
export const workOrderCloseApprovals = sqliteTable("work_order_close_approvals", {
  id: text("id").primaryKey(), workOrderId: text("work_order_id").notNull().references(() => maintenanceWorkOrders.id), requestedBy: text("requested_by").notNull().references(() => users.id), requestedAt: integer("requested_at").notNull(), status: text("status").notNull().default("pending"), decidedBy: text("decided_by").references(() => users.id), decidedAt: integer("decided_at"), note: text("note").notNull().default(""),
});
export const businessCalendars = sqliteTable("business_calendars", { id: text("id").primaryKey(), name: text("name").notNull(), timezone: text("timezone").notNull().default("Asia/Ho_Chi_Minh"), workingWindows: text("working_windows").notNull(), status: text("status").notNull().default("active") });
export const slaInstances = sqliteTable("sla_instances", { id: text("id").primaryKey(), workOrderId: text("work_order_id").notNull().unique().references(() => maintenanceWorkOrders.id), calendarId: text("calendar_id").notNull().references(() => businessCalendars.id), warningAt: integer("warning_at").notNull(), dueAt: integer("due_at").notNull(), status: text("status").notNull().default("running"), pausedAt: integer("paused_at"), pausedSeconds: integer("paused_seconds").notNull().default(0), pauseReason: text("pause_reason"), updatedAt: integer("updated_at").notNull() });
export const slaJobEvents = sqliteTable("sla_job_events", { id: text("id").primaryKey(), slaInstanceId: text("sla_instance_id").notNull().references(() => slaInstances.id), eventType: text("event_type").notNull(), idempotencyKey: text("idempotency_key").notNull().unique(), recipientScope: text("recipient_scope").notNull(), createdAt: integer("created_at").notNull() });
export const resourceProfiles = sqliteTable("resource_profiles", { id: text("id").primaryKey(), userId: text("user_id").references(() => users.id), providerId: text("provider_id").references(() => serviceProviders.id), location: text("location").notNull(), timezone: text("timezone").notNull().default("Asia/Ho_Chi_Minh"), workingWindows: text("working_windows").notNull(), status: text("status").notNull().default("active") });
export const resourceSkills = sqliteTable("resource_skills", { id: text("id").primaryKey(), resourceId: text("resource_id").notNull().references(() => resourceProfiles.id, { onDelete: "cascade" }), skillCode: text("skill_code").notNull(), certificateCode: text("certificate_code"), validUntil: integer("valid_until") });
export const resourceBookings = sqliteTable("resource_bookings", { id: text("id").primaryKey(), resourceId: text("resource_id").notNull().references(() => resourceProfiles.id), workOrderId: text("work_order_id").notNull().references(() => maintenanceWorkOrders.id), startsAt: integer("starts_at").notNull(), endsAt: integer("ends_at").notNull(), status: text("status").notNull().default("confirmed"), createdAt: integer("created_at").notNull() });
export const providerMemberships = sqliteTable("provider_memberships", { id: text("id").primaryKey(), providerId: text("provider_id").notNull().references(() => serviceProviders.id), userId: text("user_id").notNull().references(() => users.id), status: text("status").notNull().default("active") });
export const providerAssignments = sqliteTable("provider_assignments", { id: text("id").primaryKey(), workOrderId: text("work_order_id").notNull().references(() => maintenanceWorkOrders.id), providerId: text("provider_id").notNull().references(() => serviceProviders.id), version: integer("version").notNull().default(1), status: text("status").notNull().default("awaiting_provider"), responseDeadline: integer("response_deadline").notNull(), promisedAt: integer("promised_at"), responseNote: text("response_note").notNull().default(""), respondedBy: text("responded_by").references(() => users.id), respondedAt: integer("responded_at"), confirmedBy: text("confirmed_by").references(() => users.id), confirmedAt: integer("confirmed_at") });
export const accessReviews = sqliteTable("access_reviews", { id: text("id").primaryKey(), organization: text("organization").notNull(), scope: text("scope").notNull(), status: text("status").notNull().default("open"), deadline: integer("deadline").notNull(), createdBy: text("created_by").notNull().references(() => users.id), createdAt: integer("created_at").notNull() });
export const configurationChanges = sqliteTable("configuration_changes", { id: text("id").primaryKey(), entityType: text("entity_type").notNull(), entityId: text("entity_id").notNull(), payload: text("payload").notNull(), reason: text("reason").notNull(), makerId: text("maker_id").notNull().references(() => users.id), status: text("status").notNull().default("pending"), checkerId: text("checker_id").references(() => users.id), decidedAt: integer("decided_at"), createdAt: integer("created_at").notNull() });
export const notifications = sqliteTable("notifications", { id: text("id").primaryKey(), recipientId: text("recipient_id").notNull().references(() => users.id), type: text("type").notNull(), entityType: text("entity_type").notNull(), entityId: text("entity_id").notNull(), dedupeKey: text("dedupe_key").notNull().unique(), title: text("title").notNull(), body: text("body").notNull(), status: text("status").notNull().default("pending"), attempts: integer("attempts").notNull().default(0), createdAt: integer("created_at").notNull(), deliveredAt: integer("delivered_at") });

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
