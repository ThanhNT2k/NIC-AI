import { can } from "./access-control";
import type { SessionUser } from "./d1-auth";

export type ScopedRequest = {
  id: string;
  ownerId: string;
  organization: string;
  status: string;
  targetDepartment: string;
};

export function canReadRequest(user: SessionUser, item: ScopedRequest) {
  if (item.ownerId === user.id && item.organization === user.organization) return true;
  if (can(user.role, "request:read:organization") && item.organization === user.organization) return true;
  return can(user.role, "request:read:assigned_team") && Boolean(user.departmentCode) && item.targetDepartment === user.departmentCode;
}

export function canCommentRequest(user: SessionUser, item: ScopedRequest) {
  const customerParticipant = item.organization === user.organization && (item.ownerId === user.id || ["customer_member", "customer_admin", "tenant_member", "tenant_admin"].includes(user.role));
  const assignedTeam = can(user.role, "request:read:assigned_team") && Boolean(user.departmentCode) && item.targetDepartment === user.departmentCode;
  return item.status !== "cancelled" && (customerParticipant || assignedTeam);
}
