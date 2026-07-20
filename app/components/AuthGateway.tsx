"use client";

import { AuthScreen } from "./ConciergeWorkspace";

export function AuthGateway({ initialMode }: { initialMode: "login" | "register" }) {
  return <AuthScreen initialMode={initialMode} onAuthenticated={(user) => {
    window.location.href = ["service_desk", "facility_staff", "facility_manager"].includes(user.role) ? "/portal/operations" : "/portal";
  }} />;
}
