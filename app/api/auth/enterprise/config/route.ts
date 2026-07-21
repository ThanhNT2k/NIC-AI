export async function GET() {
  return Response.json({ enabled: Boolean(process.env.OIDC_ISSUER && process.env.OIDC_CLIENT_ID && process.env.OIDC_REDIRECT_URI), required: process.env.ENTERPRISE_AUTH_REQUIRED === "1", startUrl: "/api/auth/enterprise/start" }, { headers: { "cache-control": "no-store" } });
}
