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
  accountStatus: text("account_status").notNull().default("active"),
  identityProvider: text("identity_provider").notNull().default("local"),
  identitySubject: text("identity_subject"),
  mfaRequired: integer("mfa_required").notNull().default(0),
  createdAt: integer("created_at").notNull(),
});

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  csrfHash: text("csrf_hash").notNull(),
  authMethod: text("auth_method").notNull().default("local"),
  mfaVerified: integer("mfa_verified").notNull().default(0),
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

export const requestComments = sqliteTable("request_comments", {
  id: text("id").primaryKey(),
  requestId: text("request_id").notNull().references(() => serviceRequests.id),
  authorId: text("author_id").notNull().references(() => users.id),
  body: text("body").notNull(),
  createdAt: integer("created_at").notNull(),
});

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
  assetId: text("asset_id"),
  maintenancePlanId: text("maintenance_plan_id"),
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
  accessZoneId: text("access_zone_id"),
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
  templateId: text("template_id"),
  budgetEstimateMinor: integer("budget_estimate_minor").notNull().default(0),
  budgetActualMinor: integer("budget_actual_minor").notNull().default(0),
  budgetThresholdMinor: integer("budget_threshold_minor").notNull().default(0),
  budgetStatus: text("budget_status").notNull().default("not_required"),
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
  correlationId: text("correlation_id"),
  source: text("source").notNull().default("application"),
  createdAt: integer("created_at").notNull(),
});

export const assets = sqliteTable("assets", {
  id: text("id").primaryKey(), organization: text("organization").notNull(), parentAssetId: text("parent_asset_id"), code: text("code").notNull(), name: text("name").notNull(), location: text("location").notNull(), category: text("category").notNull(), status: text("status").notNull().default("active"), serialNumber: text("serial_number"), model: text("model"), providerId: text("provider_id").references(() => serviceProviders.id), warrantyStart: integer("warranty_start"), warrantyEnd: integer("warranty_end"), ownerId: text("owner_id").notNull().references(() => users.id), createdAt: integer("created_at").notNull(), updatedAt: integer("updated_at").notNull(),
}, (table) => [uniqueIndex("assets_org_code_unique").on(table.organization, table.code)]);

export const maintenancePlans = sqliteTable("maintenance_plans", {
  id: text("id").primaryKey(), assetId: text("asset_id").notNull().references(() => assets.id), name: text("name").notNull(), recurrenceDays: integer("recurrence_days").notNull(), leadTimeDays: integer("lead_time_days").notNull().default(7), bookingWindowDays: integer("booking_window_days").notNull().default(14), nextDueAt: integer("next_due_at").notNull(), templateId: text("template_id").references(() => operationTemplates.id), status: text("status").notNull().default("active"), createdBy: text("created_by").notNull().references(() => users.id), createdAt: integer("created_at").notNull(), updatedAt: integer("updated_at").notNull(),
});

export const maintenancePlanRuns = sqliteTable("maintenance_plan_runs", {
  id: text("id").primaryKey(), planId: text("plan_id").notNull().references(() => maintenancePlans.id), dueAt: integer("due_at").notNull(), workOrderId: text("work_order_id").notNull().references(() => maintenanceWorkOrders.id), idempotencyKey: text("idempotency_key").notNull().unique(), createdAt: integer("created_at").notNull(),
}, (table) => [uniqueIndex("maintenance_plan_run_due_unique").on(table.planId, table.dueAt)]);

export const workOrderCostLines = sqliteTable("work_order_cost_lines", {
  id: text("id").primaryKey(), workOrderId: text("work_order_id").notNull().references(() => maintenanceWorkOrders.id), lineType: text("line_type").notNull(), phase: text("phase").notNull(), description: text("description").notNull(), quantityMilli: integer("quantity_milli").notNull(), unit: text("unit").notNull(), unitPriceMinor: integer("unit_price_minor").notNull(), taxBps: integer("tax_bps").notNull().default(0), discountBps: integer("discount_bps").notNull().default(0), subtotalMinor: integer("subtotal_minor").notNull(), discountMinor: integer("discount_minor").notNull(), taxMinor: integer("tax_minor").notNull(), lineTotalMinor: integer("line_total_minor").notNull(), currency: text("currency").notNull().default("VND"), catalogRecordId: text("catalog_record_id"), createdBy: text("created_by").notNull().references(() => users.id), createdAt: integer("created_at").notNull(),
});

export const eventTemplates = sqliteTable("event_templates", {
  id: text("id").primaryKey(), name: text("name").notNull(), eventType: text("event_type").notNull(), scale: text("scale").notNull(), version: integer("version").notNull().default(1), budgetThresholdMinor: integer("budget_threshold_minor").notNull().default(0), status: text("status").notNull().default("draft"), createdBy: text("created_by").notNull().references(() => users.id), createdAt: integer("created_at").notNull(),
});
export const eventTemplateTasks = sqliteTable("event_template_tasks", { id: text("id").primaryKey(), templateId: text("template_id").notNull().references(() => eventTemplates.id, { onDelete: "cascade" }), sequence: integer("sequence").notNull(), title: text("title").notNull(), dueOffsetDays: integer("due_offset_days").notNull().default(0), dependencySequence: integer("dependency_sequence"), required: integer("required").notNull().default(1), defaultAssigneeRole: text("default_assignee_role") });
export const eventTemplateLines = sqliteTable("event_template_lines", { id: text("id").primaryKey(), templateId: text("template_id").notNull().references(() => eventTemplates.id, { onDelete: "cascade" }), lineType: text("line_type").notNull(), description: text("description").notNull(), quantityMilli: integer("quantity_milli").notNull(), unit: text("unit").notNull(), unitPriceMinor: integer("unit_price_minor").notNull() });
export const eventChecklistTasks = sqliteTable("event_checklist_tasks", { id: text("id").primaryKey(), eventOrderId: text("event_order_id").notNull().references(() => eventServiceOrders.id, { onDelete: "cascade" }), sourceTemplateTaskId: text("source_template_task_id").references(() => eventTemplateTasks.id), sequence: integer("sequence").notNull(), title: text("title").notNull(), dueAt: integer("due_at").notNull(), dependsOnTaskId: text("depends_on_task_id"), required: integer("required").notNull().default(1), assigneeId: text("assignee_id").references(() => users.id), status: text("status").notNull().default("pending"), completedBy: text("completed_by").references(() => users.id), completedAt: integer("completed_at"), updatedAt: integer("updated_at").notNull() });
export const eventBudgetLines = sqliteTable("event_budget_lines", { id: text("id").primaryKey(), eventOrderId: text("event_order_id").notNull().references(() => eventServiceOrders.id, { onDelete: "cascade" }), sourceTemplateLineId: text("source_template_line_id").references(() => eventTemplateLines.id), lineType: text("line_type").notNull(), description: text("description").notNull(), quantityMilli: integer("quantity_milli").notNull(), unit: text("unit").notNull(), unitPriceMinor: integer("unit_price_minor").notNull(), lineTotalMinor: integer("line_total_minor").notNull(), phase: text("phase").notNull().default("estimate"), createdAt: integer("created_at").notNull() });
export const eventBudgetApprovals = sqliteTable("event_budget_approvals", { id: text("id").primaryKey(), eventOrderId: text("event_order_id").notNull().references(() => eventServiceOrders.id), requestedBy: text("requested_by").notNull().references(() => users.id), requestedAt: integer("requested_at").notNull(), status: text("status").notNull().default("pending"), decidedBy: text("decided_by").references(() => users.id), decidedAt: integer("decided_at"), note: text("note").notNull().default("") });

export const accessZones = sqliteTable("access_zones", { id: text("id").primaryKey(), code: text("code").notNull().unique(), name: text("name").notNull(), controllerRef: text("controller_ref").notNull(), status: text("status").notNull().default("active") });
export const visitorQrTokens = sqliteTable("visitor_qr_tokens", { id: text("id").primaryKey(), visitorId: text("visitor_id").notNull().references(() => visitorRegistrations.id, { onDelete: "cascade" }), tokenHash: text("token_hash").notNull().unique(), expiresAt: integer("expires_at").notNull(), redeemedAt: integer("redeemed_at"), redeemedBy: text("redeemed_by").references(() => users.id), createdBy: text("created_by").notNull().references(() => users.id), createdAt: integer("created_at").notNull() });
export const badgePrintJobs = sqliteTable("badge_print_jobs", { id: text("id").primaryKey(), visitorId: text("visitor_id").notNull().references(() => visitorRegistrations.id), templateVersion: integer("template_version").notNull().default(1), printerRef: text("printer_ref").notNull(), status: text("status").notNull().default("queued"), isReprint: integer("is_reprint").notNull().default(0), reason: text("reason").notNull(), renderPayload: text("render_payload").notNull(), actorId: text("actor_id").notNull().references(() => users.id), createdAt: integer("created_at").notNull(), printedAt: integer("printed_at") });
export const visitorAccessGrants = sqliteTable("visitor_access_grants", { id: text("id").primaryKey(), visitorId: text("visitor_id").notNull().references(() => visitorRegistrations.id), accessZoneId: text("access_zone_id").notNull().references(() => accessZones.id), validFrom: integer("valid_from").notNull(), validUntil: integer("valid_until").notNull(), status: text("status").notNull().default("pending"), controllerGrantRef: text("controller_grant_ref"), createdAt: integer("created_at").notNull(), revokedAt: integer("revoked_at") });
export const accessControllerEvents = sqliteTable("access_controller_events", { id: text("id").primaryKey(), visitorId: text("visitor_id").notNull().references(() => visitorRegistrations.id), accessGrantId: text("access_grant_id").references(() => visitorAccessGrants.id), eventType: text("event_type").notNull(), controllerRef: text("controller_ref"), status: text("status").notNull(), reason: text("reason").notNull(), actorId: text("actor_id").notNull().references(() => users.id), createdAt: integer("created_at").notNull() });

export const masterDataRecords = sqliteTable("master_data_records", { id: text("id").primaryKey(), entityType: text("entity_type").notNull(), recordKey: text("record_key").notNull(), version: integer("version").notNull(), status: text("status").notNull().default("draft"), ownerId: text("owner_id").notNull().references(() => users.id), effectiveFrom: integer("effective_from").notNull(), effectiveTo: integer("effective_to"), payload: text("payload").notNull(), reason: text("reason").notNull(), makerId: text("maker_id").notNull().references(() => users.id), checkerId: text("checker_id").references(() => users.id), decidedAt: integer("decided_at"), createdAt: integer("created_at").notNull() }, (table) => [uniqueIndex("master_data_record_version_unique").on(table.entityType, table.recordKey, table.version)]);

export const oidcLoginAttempts = sqliteTable("oidc_login_attempts", { id: text("id").primaryKey(), stateHash: text("state_hash").notNull().unique(), nonceHash: text("nonce_hash").notNull(), codeVerifier: text("code_verifier").notNull(), returnTo: text("return_to").notNull().default("/portal"), expiresAt: integer("expires_at").notNull(), consumedAt: integer("consumed_at"), createdAt: integer("created_at").notNull() });
export const financePolicies = sqliteTable("finance_policies", { id: text("id").primaryKey(), organization: text("organization").notNull().unique(), currency: text("currency").notNull().default("VND"), poApprovalThresholdMinor: integer("po_approval_threshold_minor").notNull(), priceToleranceBps: integer("price_tolerance_bps").notNull().default(500), quantityToleranceBps: integer("quantity_tolerance_bps").notNull().default(0), updatedBy: text("updated_by").notNull().references(() => users.id), updatedAt: integer("updated_at").notNull() });
export const procurementContracts = sqliteTable("procurement_contracts", { id: text("id").primaryKey(), organization: text("organization").notNull(), contractNumber: text("contract_number").notNull(), providerId: text("provider_id").notNull().references(() => serviceProviders.id), title: text("title").notNull(), version: integer("version").notNull().default(1), status: text("status").notNull().default("draft"), currency: text("currency").notNull().default("VND"), validFrom: integer("valid_from").notNull(), validUntil: integer("valid_until").notNull(), ceilingMinor: integer("ceiling_minor").notNull(), createdBy: text("created_by").notNull().references(() => users.id), createdAt: integer("created_at").notNull(), updatedAt: integer("updated_at").notNull() }, table => [uniqueIndex("procurement_contract_version_unique").on(table.organization, table.contractNumber, table.version)]);
export const procurementContractLines = sqliteTable("procurement_contract_lines", { id: text("id").primaryKey(), contractId: text("contract_id").notNull().references(() => procurementContracts.id, { onDelete: "cascade" }), lineNumber: integer("line_number").notNull(), description: text("description").notNull(), unit: text("unit").notNull(), maxQuantityMilli: integer("max_quantity_milli").notNull(), unitPriceMinor: integer("unit_price_minor").notNull() });
export const purchaseOrders = sqliteTable("purchase_orders", { id: text("id").primaryKey(), organization: text("organization").notNull(), poNumber: text("po_number").notNull(), version: integer("version").notNull().default(1), providerId: text("provider_id").notNull().references(() => serviceProviders.id), contractId: text("contract_id").references(() => procurementContracts.id), workOrderId: text("work_order_id").references(() => maintenanceWorkOrders.id), eventOrderId: text("event_order_id").references(() => eventServiceOrders.id), status: text("status").notNull().default("draft"), currency: text("currency").notNull().default("VND"), subtotalMinor: integer("subtotal_minor").notNull(), approvalThresholdMinor: integer("approval_threshold_minor").notNull(), idempotencyKey: text("idempotency_key").notNull(), createdBy: text("created_by").notNull().references(() => users.id), approvedBy: text("approved_by").references(() => users.id), approvedAt: integer("approved_at"), issuedAt: integer("issued_at"), createdAt: integer("created_at").notNull(), updatedAt: integer("updated_at").notNull() }, table => [uniqueIndex("purchase_order_idempotency_unique").on(table.organization, table.idempotencyKey)]);
export const purchaseOrderLines = sqliteTable("purchase_order_lines", { id: text("id").primaryKey(), purchaseOrderId: text("purchase_order_id").notNull().references(() => purchaseOrders.id, { onDelete: "cascade" }), contractLineId: text("contract_line_id").references(() => procurementContractLines.id), lineNumber: integer("line_number").notNull(), description: text("description").notNull(), lineType: text("line_type").notNull().default("service"), quantityMilli: integer("quantity_milli").notNull(), unit: text("unit").notNull(), unitPriceMinor: integer("unit_price_minor").notNull(), lineTotalMinor: integer("line_total_minor").notNull() });
export const purchaseOrderApprovals = sqliteTable("purchase_order_approvals", { id: text("id").primaryKey(), purchaseOrderId: text("purchase_order_id").notNull().unique().references(() => purchaseOrders.id, { onDelete: "cascade" }), requestedBy: text("requested_by").notNull().references(() => users.id), requestedAt: integer("requested_at").notNull(), status: text("status").notNull().default("pending"), decidedBy: text("decided_by").references(() => users.id), decidedAt: integer("decided_at"), note: text("note").notNull().default("") });
export const goodsReceipts = sqliteTable("goods_receipts", { id: text("id").primaryKey(), purchaseOrderId: text("purchase_order_id").notNull().references(() => purchaseOrders.id), receiptNumber: text("receipt_number").notNull(), status: text("status").notNull().default("posted"), receivedAt: integer("received_at").notNull(), idempotencyKey: text("idempotency_key").notNull(), receivedBy: text("received_by").notNull().references(() => users.id), createdAt: integer("created_at").notNull() });
export const goodsReceiptLines = sqliteTable("goods_receipt_lines", { id: text("id").primaryKey(), receiptId: text("receipt_id").notNull().references(() => goodsReceipts.id, { onDelete: "cascade" }), purchaseOrderLineId: text("purchase_order_line_id").notNull().references(() => purchaseOrderLines.id), quantityReceivedMilli: integer("quantity_received_milli").notNull(), condition: text("condition").notNull().default("accepted"), note: text("note").notNull().default("") });
export const supplierInvoices = sqliteTable("supplier_invoices", { id: text("id").primaryKey(), purchaseOrderId: text("purchase_order_id").notNull().references(() => purchaseOrders.id), providerId: text("provider_id").notNull().references(() => serviceProviders.id), invoiceNumber: text("invoice_number").notNull(), invoiceDate: integer("invoice_date").notNull(), status: text("status").notNull().default("pending_match"), currency: text("currency").notNull(), totalMinor: integer("total_minor").notNull(), idempotencyKey: text("idempotency_key").notNull(), createdBy: text("created_by").notNull().references(() => users.id), createdAt: integer("created_at").notNull(), updatedAt: integer("updated_at").notNull() });
export const supplierInvoiceLines = sqliteTable("supplier_invoice_lines", { id: text("id").primaryKey(), invoiceId: text("invoice_id").notNull().references(() => supplierInvoices.id, { onDelete: "cascade" }), purchaseOrderLineId: text("purchase_order_line_id").notNull().references(() => purchaseOrderLines.id), lineNumber: integer("line_number").notNull(), quantityMilli: integer("quantity_milli").notNull(), unitPriceMinor: integer("unit_price_minor").notNull(), lineTotalMinor: integer("line_total_minor").notNull() });
export const threeWayMatches = sqliteTable("three_way_matches", { id: text("id").primaryKey(), invoiceId: text("invoice_id").notNull().unique().references(() => supplierInvoices.id), status: text("status").notNull(), priceToleranceBps: integer("price_tolerance_bps").notNull(), quantityToleranceBps: integer("quantity_tolerance_bps").notNull(), varianceMinor: integer("variance_minor").notNull(), resultPayload: text("result_payload").notNull(), matchedBy: text("matched_by").notNull().references(() => users.id), matchedAt: integer("matched_at").notNull() });
export const procurementExceptions = sqliteTable("procurement_exceptions", { id: text("id").primaryKey(), invoiceId: text("invoice_id").notNull().references(() => supplierInvoices.id), exceptionType: text("exception_type").notNull(), severity: text("severity").notNull().default("high"), status: text("status").notNull().default("open"), details: text("details").notNull(), assignedRole: text("assigned_role").notNull().default("finance_manager"), createdAt: integer("created_at").notNull(), resolvedBy: text("resolved_by").references(() => users.id), resolvedAt: integer("resolved_at") });
export const observabilityEvents = sqliteTable("observability_events", { id: text("id").primaryKey(), correlationId: text("correlation_id").notNull(), traceId: text("trace_id").notNull(), level: text("level").notNull(), eventName: text("event_name").notNull(), route: text("route").notNull(), actorHash: text("actor_hash"), statusCode: integer("status_code"), durationMs: integer("duration_ms"), errorCode: text("error_code"), metadata: text("metadata").notNull().default("{}"), createdAt: integer("created_at").notNull() });
export const diagnosticReports = sqliteTable("diagnostic_reports", { id: text("id").primaryKey(), correlationId: text("correlation_id").notNull(), traceId: text("trace_id").notNull(), route: text("route").notNull(), errorClass: text("error_class").notNull(), errorCode: text("error_code").notNull(), safeMessage: text("safe_message").notNull(), frames: text("frames").notNull(), actorHash: text("actor_hash"), createdAt: integer("created_at").notNull() });
export const knowledgeDocuments = sqliteTable("knowledge_documents", { id: text("id").primaryKey(), serviceType: text("service_type").notNull(), title: text("title").notNull(), content: text("content").notNull(), sourceUri: text("source_uri").notNull(), version: integer("version").notNull().default(1), status: text("status").notNull().default("active"), updatedAt: integer("updated_at").notNull() });
export const operationalIncidents = sqliteTable("operational_incidents", { id: text("id").primaryKey(), correlationId: text("correlation_id").notNull(), source: text("source").notNull(), severity: text("severity").notNull(), title: text("title").notNull(), status: text("status").notNull().default("open"), runbook: text("runbook").notNull(), dedupeKey: text("dedupe_key").notNull().unique(), createdAt: integer("created_at").notNull(), resolvedAt: integer("resolved_at") });
export const retentionPolicies = sqliteTable("retention_policies", { id: text("id").primaryKey(), dataClass: text("data_class").notNull().unique(), retentionDays: integer("retention_days").notNull(), action: text("action").notNull(), legalBasis: text("legal_basis").notNull(), status: text("status").notNull().default("active"), updatedBy: text("updated_by").notNull().references(() => users.id), updatedAt: integer("updated_at").notNull() });
export const legalHolds = sqliteTable("legal_holds", { id: text("id").primaryKey(), entityType: text("entity_type").notNull(), entityId: text("entity_id").notNull(), reason: text("reason").notNull(), status: text("status").notNull().default("active"), createdBy: text("created_by").notNull().references(() => users.id), createdAt: integer("created_at").notNull(), releasedBy: text("released_by").references(() => users.id), releasedAt: integer("released_at") });
export const retentionJobRuns = sqliteTable("retention_job_runs", { id: text("id").primaryKey(), correlationId: text("correlation_id").notNull(), dryRun: integer("dry_run").notNull().default(1), status: text("status").notNull(), candidateCount: integer("candidate_count").notNull().default(0), processedCount: integer("processed_count").notNull().default(0), heldCount: integer("held_count").notNull().default(0), errorCode: text("error_code"), startedAt: integer("started_at").notNull(), completedAt: integer("completed_at") });
export const retentionArchive = sqliteTable("retention_archive", { id: text("id").primaryKey(), jobRunId: text("job_run_id").notNull().references(() => retentionJobRuns.id), dataClass: text("data_class").notNull(), entityType: text("entity_type").notNull(), entityId: text("entity_id").notNull(), payload: text("payload").notNull(), payloadHash: text("payload_hash").notNull(), archivedAt: integer("archived_at").notNull() });
