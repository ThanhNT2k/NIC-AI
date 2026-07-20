import { clearedSessionHeaders, deleteCurrentSession, requireCsrf } from "@/lib/d1-auth";

export async function POST(request: Request) {
  if (!await requireCsrf(request)) return Response.json({ error: "CSRF_INVALID" }, { status: 403 });
  await deleteCurrentSession(request);
  return new Response(JSON.stringify({ ok: true }), { headers: clearedSessionHeaders() });
}
