import { currentUser } from "@/lib/d1-auth";
export async function GET(request: Request) { const user = await currentUser(request); return user ? Response.json({ user }) : Response.json({ error: "AUTH_REQUIRED" }, { status: 401 }); }
