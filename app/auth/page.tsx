import { AuthGateway } from "../components/AuthGateway";

export default async function AuthPage({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
  const params = await searchParams;
  return <AuthGateway initialMode={params.mode === "register" ? "register" : "login"} />;
}
