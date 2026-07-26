export const requestStatuses = ["submitted", "triaged", "in_progress", "waiting_customer", "resolved", "cancelled"];
export const workOrderStatuses = ["open", "scheduled", "in_progress", "completed", "cancelled"];
export const workOrderPriorities = ["low", "normal", "high", "critical"];
export function isRequestStatus(value) {
    return typeof value === "string" && requestStatuses.includes(value);
}
export function isWorkOrderStatus(value) {
    return typeof value === "string" && workOrderStatuses.includes(value);
}
export function isWorkOrderPriority(value) {
    return typeof value === "string" && workOrderPriorities.includes(value);
}
const requestTransitions = {
    submitted: ["triaged", "in_progress", "waiting_customer", "cancelled"],
    triaged: ["in_progress", "waiting_customer", "cancelled"],
    in_progress: ["waiting_customer", "resolved", "cancelled"],
    waiting_customer: ["in_progress", "resolved", "cancelled"],
    resolved: ["in_progress"],
    cancelled: [],
};
const workOrderTransitions = {
    open: ["scheduled", "in_progress", "cancelled"],
    scheduled: ["in_progress", "cancelled"],
    in_progress: ["completed", "cancelled"],
    completed: ["in_progress"],
    cancelled: [],
};
export function canTransitionRequest(from, to) {
    return from === to || requestTransitions[from]?.includes(to) === true;
}
export function canCustomerCancelRequest(status) {
    return status === "submitted" || status === "triaged";
}
export function canTransitionWorkOrder(from, to) {
    return from === to || workOrderTransitions[from]?.includes(to) === true;
}
export function validBookingWindow(startsAt, endsAt, now = Math.floor(Date.now() / 1000)) {
    return Number.isInteger(startsAt) && Number.isInteger(endsAt) && startsAt >= now - 300 && endsAt > startsAt && endsAt - startsAt <= 86_400;
}
