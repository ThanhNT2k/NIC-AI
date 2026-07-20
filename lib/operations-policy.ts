export const requestStatuses = ["submitted", "triaged", "in_progress", "waiting_customer", "resolved", "cancelled"] as const;
export const workOrderStatuses = ["open", "scheduled", "in_progress", "completed", "cancelled"] as const;
export const workOrderPriorities = ["low", "normal", "high", "critical"] as const;

export function isRequestStatus(value: unknown): value is typeof requestStatuses[number] {
  return typeof value === "string" && requestStatuses.includes(value as typeof requestStatuses[number]);
}

export function isWorkOrderStatus(value: unknown): value is typeof workOrderStatuses[number] {
  return typeof value === "string" && workOrderStatuses.includes(value as typeof workOrderStatuses[number]);
}

export function isWorkOrderPriority(value: unknown): value is typeof workOrderPriorities[number] {
  return typeof value === "string" && workOrderPriorities.includes(value as typeof workOrderPriorities[number]);
}

const requestTransitions: Record<string, readonly string[]> = {
  submitted: ["triaged", "in_progress", "waiting_customer", "cancelled"],
  triaged: ["in_progress", "waiting_customer", "cancelled"],
  in_progress: ["waiting_customer", "resolved", "cancelled"],
  waiting_customer: ["in_progress", "resolved", "cancelled"],
  resolved: ["in_progress"],
  cancelled: [],
};

const workOrderTransitions: Record<string, readonly string[]> = {
  open: ["scheduled", "in_progress", "cancelled"],
  scheduled: ["in_progress", "cancelled"],
  in_progress: ["completed", "cancelled"],
  completed: ["in_progress"],
  cancelled: [],
};

export function canTransitionRequest(from: string, to: string) {
  return from === to || requestTransitions[from]?.includes(to) === true;
}

export function canTransitionWorkOrder(from: string, to: string) {
  return from === to || workOrderTransitions[from]?.includes(to) === true;
}

export function validBookingWindow(startsAt: number, endsAt: number, now = Math.floor(Date.now() / 1000)) {
  return Number.isInteger(startsAt) && Number.isInteger(endsAt) && startsAt >= now - 300 && endsAt > startsAt && endsAt - startsAt <= 86_400;
}
