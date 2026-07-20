export type ErpRole = "customer_member" | "customer_admin" | "service_desk" | "facility_staff" | "facility_manager" | "event_staff" | "event_manager" | "security_staff" | "system_admin" | "auditor";
export type Capability = "request:create" | "request:read:own" | "request:read:organization" | "request:read:assigned_team" | "request:route" | "request:update_status" | "booking:create" | "booking:read:own" | "booking:manage" | "work_order:create" | "work_order:manage" | "visitor:create" | "visitor:manage" | "event_service:create" | "event_service:manage" | "provider:read" | "provider:assign" | "organization:manage_members" | "reports:read" | "audit:read" | "system:manage_access";

const grants: Record<ErpRole, readonly Capability[]> = {
  customer_member: ["request:create", "request:read:own", "booking:create", "booking:read:own", "visitor:create", "event_service:create"],
  customer_admin: ["request:create", "request:read:own", "request:read:organization", "booking:create", "booking:read:own", "visitor:create", "event_service:create", "organization:manage_members"],
  service_desk: ["request:create", "request:read:own", "request:read:assigned_team", "request:route", "request:update_status"],
  facility_staff: ["request:create", "request:read:own", "request:read:assigned_team", "request:update_status", "booking:manage", "work_order:create", "work_order:manage", "provider:read"],
  facility_manager: ["request:create", "request:read:own", "request:read:assigned_team", "request:route", "request:update_status", "booking:manage", "work_order:create", "work_order:manage", "provider:read", "provider:assign", "reports:read"],
  event_staff: ["request:create", "request:read:own", "request:read:assigned_team", "request:update_status", "event_service:manage", "provider:read"],
  event_manager: ["request:create", "request:read:own", "request:read:assigned_team", "request:route", "request:update_status", "event_service:manage", "provider:read", "provider:assign", "reports:read"],
  security_staff: ["request:create", "request:read:own", "request:read:assigned_team", "request:update_status", "visitor:manage"],
  system_admin: ["request:create", "request:read:own", "request:read:organization", "request:read:assigned_team", "request:route", "request:update_status", "booking:create", "booking:read:own", "booking:manage", "work_order:create", "work_order:manage", "visitor:create", "visitor:manage", "event_service:create", "event_service:manage", "provider:read", "provider:assign", "organization:manage_members", "reports:read", "audit:read", "system:manage_access"],
  auditor: ["request:read:organization", "reports:read", "audit:read"],
};

export const customerCapabilities = grants.customer_member;

export function normalizeRole(role: string): ErpRole {
  if (role === "tenant_member") return "customer_member";
  if (role === "tenant_admin") return "customer_admin";
  return role in grants ? role as ErpRole : "customer_member";
}

export function capabilitiesFor(role: string) {
  return grants[normalizeRole(role)];
}

export function can(role: string, capability: Capability) {
  return capabilitiesFor(role).includes(capability);
}

export function targetTeamFor(serviceType: string) {
  return ({ space_booking: "facility", support: "service_desk", event_registration: "event", access_card: "security" } as Record<string, string>)[serviceType] ?? "service_desk";
}
