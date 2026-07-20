import { currentUser, database } from "@/lib/d1-auth";
import { can } from "@/lib/access-control";

export async function GET(request: Request) {
  const user = await currentUser(request); if (!user) return Response.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  const db = await database();
  const columns = "id, service_type AS serviceType, title, status, target_department AS targetDepartment, assigned_to AS assignedTo, created_at AS createdAt";
  if (can(user.role, "request:read:assigned_team") && user.departmentCode) {
    const rows = await db.prepare(`SELECT ${columns} FROM service_requests WHERE target_department = ? ORDER BY created_at DESC LIMIT 50`).bind(user.departmentCode).all();
    return Response.json({ scope: "assigned_team", requests: rows.results });
  }
  if (can(user.role, "request:read:organization")) {
    const rows = await db.prepare(`SELECT ${columns} FROM service_requests WHERE organization = ? ORDER BY created_at DESC LIMIT 50`).bind(user.organization).all();
    return Response.json({ scope: "organization", requests: rows.results });
  }
  const rows = await db.prepare(`SELECT ${columns} FROM service_requests WHERE owner_id = ? AND organization = ? ORDER BY created_at DESC LIMIT 50`).bind(user.id, user.organization).all();
  return Response.json({ scope: "own", requests: rows.results });
}
