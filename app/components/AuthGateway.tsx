"use client";

import { AuthScreen } from "./ConciergeWorkspace";

export function AuthGateway({ initialMode }: { initialMode: "login" | "register" }) {
  return <AuthScreen initialMode={initialMode} onAuthenticated={() => { window.location.href = "/portal"; }} />;
}
