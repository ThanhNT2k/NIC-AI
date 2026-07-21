"use client";

import { AuthScreen } from "./ConciergeWorkspace";

export function AuthGateway({ initialMode }: { initialMode: "login" | "register" }) {
  return <AuthScreen initialMode={initialMode} onAuthenticated={(user) => {
    window.location.href = user.role === "finance_manager" ? "/portal/procurement" : user.email === "provider@demo.nic.vn" || user.role === "system_admin" ? "/portal/reliability" : ["service_desk", "facility_staff", "facility_manager"].includes(user.role) ? "/portal/operations" : ["event_staff", "event_manager", "security_staff"].includes(user.role) ? "/portal/coordination" : "/portal";
  }} />;
}
