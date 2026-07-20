export const visitorStatuses = ["pending", "approved", "checked_in", "checked_out", "cancelled"] as const;
export const eventServiceStatuses = ["requested", "coordinating", "confirmed", "completed", "cancelled"] as const;

const visitorTransitions: Record<string, readonly string[]> = {
  pending: ["approved", "cancelled"], approved: ["checked_in", "cancelled"], checked_in: ["checked_out"], checked_out: [], cancelled: [],
};
const eventTransitions: Record<string, readonly string[]> = {
  requested: ["coordinating", "cancelled"], coordinating: ["confirmed", "cancelled"], confirmed: ["completed", "cancelled"], completed: [], cancelled: [],
};

export function canTransitionVisitor(from: string, to: string) { return visitorTransitions[from]?.includes(to) ?? false; }
export function canTransitionEventService(from: string, to: string) { return eventTransitions[from]?.includes(to) ?? false; }
