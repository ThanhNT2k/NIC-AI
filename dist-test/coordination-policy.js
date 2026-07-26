export const visitorStatuses = ["pending", "approved", "checked_in", "checked_out", "cancelled"];
export const eventServiceStatuses = ["requested", "coordinating", "confirmed", "completed", "cancelled"];
const visitorTransitions = {
    pending: ["approved", "cancelled"], approved: ["checked_in", "cancelled"], checked_in: ["checked_out"], checked_out: [], cancelled: [],
};
const eventTransitions = {
    requested: ["coordinating", "cancelled"], coordinating: ["confirmed", "cancelled"], confirmed: ["completed", "cancelled"], completed: [], cancelled: [],
};
export function canTransitionVisitor(from, to) { return visitorTransitions[from]?.includes(to) ?? false; }
export function canTransitionEventService(from, to) { return eventTransitions[from]?.includes(to) ?? false; }
