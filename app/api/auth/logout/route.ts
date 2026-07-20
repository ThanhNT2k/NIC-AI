import { clearSessionCookie, deleteCurrentSession } from "@/lib/d1-auth";
export async function POST(request: Request) { await deleteCurrentSession(request); return Response.json({ ok: true }, { headers: { "Set-Cookie": clearSessionCookie() } }); }
