import pg from "pg";
import { createClient } from "@supabase/supabase-js";

const origin = process.env.SMOKE_ORIGIN;
const email = process.env.SMOKE_EMAIL;
const password = process.env.SMOKE_PASSWORD;
if (!origin || !email || !password) {
  throw new Error("SMOKE_ORIGIN, SMOKE_EMAIL and SMOKE_PASSWORD are required.");
}

function cookiePair(value) {
  return value.split(";", 1)[0];
}

const home = await fetch(origin);
if (!home.ok) throw new Error(`HOME_${home.status}`);

const login = await fetch(`${origin}/api/auth/login`, {
  method: "POST",
  headers: { "content-type": "application/json", origin },
  body: JSON.stringify({ email, password }),
});
if (!login.ok) throw new Error(`LOGIN_${login.status}:${await login.text()}`);
const setCookies = login.headers.getSetCookie();
const cookies = setCookies.map(cookiePair);
const csrf = cookies.find((value) => value.startsWith("nic_csrf="))?.slice("nic_csrf=".length);
if (!csrf || !cookies.some((value) => value.startsWith("nic_session="))) {
  throw new Error("AUTH_COOKIES_MISSING");
}
const cookie = cookies.join("; ");

const list = await fetch(`${origin}/api/service-drafts`, { headers: { cookie } });
if (!list.ok) throw new Error(`DRAFT_LIST_${list.status}:${await list.text()}`);

let draftId;
let storageObject;
try {
  const create = await fetch(`${origin}/api/service-drafts`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie,
      origin,
      "x-csrf-token": decodeURIComponent(csrf),
    },
    body: JSON.stringify({
      serviceType: "support",
      title: "PostgreSQL production smoke test",
      details: "Fixture tự động; được xóa ngay sau khi kiểm tra.",
    }),
  });
  if (!create.ok) throw new Error(`DRAFT_CREATE_${create.status}:${await create.text()}`);
  draftId = (await create.json()).draft.id;
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const bucket = process.env.SUPABASE_ATTACHMENT_BUCKET ?? "nic-attachments";
  storageObject = `smoke/${crypto.randomUUID()}.txt`;
  const bytes = new TextEncoder().encode("NIC storage smoke test");
  const uploaded = await supabase.storage.from(bucket).upload(storageObject, bytes, {
    contentType: "text/plain",
  });
  if (uploaded.error) throw uploaded.error;
  const downloaded = await supabase.storage.from(bucket).download(storageObject);
  if (downloaded.error || await downloaded.data.text() !== "NIC storage smoke test") {
    throw downloaded.error ?? new Error("STORAGE_CONTENT_MISMATCH");
  }
  console.log(JSON.stringify({
    origin,
    home: home.status,
    login: login.status,
    draftList: list.status,
    draftCreate: create.status,
    secureCookie: setCookies.some((value) => /;\s*Secure/i.test(value)),
    privateStorage: "upload-download-delete",
  }));
} finally {
  if (draftId && process.env.DATABASE_URL) {
    const client = new pg.Client({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      options: "-c search_path=nic_app,public",
    });
    await client.connect();
    try {
      await client.query("delete from service_drafts where id = $1", [draftId]);
    } finally {
      await client.end();
    }
  }
  if (storageObject && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
    await supabase.storage
      .from(process.env.SUPABASE_ATTACHMENT_BUCKET ?? "nic-attachments")
      .remove([storageObject]);
  }
}
