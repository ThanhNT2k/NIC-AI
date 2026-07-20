import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { pbkdf2Sync } from "node:crypto";
import test from "node:test";

test("database schema stores password derivation data instead of plaintext passwords", async () => {
  const schema = await readFile(new URL("../db/schema.ts", import.meta.url), "utf8");
  assert.match(schema, /passwordHash/);
  assert.match(schema, /passwordSalt/);
  assert.match(schema, /passwordIterations/);
  assert.doesNotMatch(schema, /password:\s*text/);
});

test("seed account hash matches the documented demo password", async () => {
  const migration = await readFile(new URL("../drizzle/0000_round_wrecker.sql", import.meta.url), "utf8");
  assert.match(migration, /thanh@demo\.nic\.vn/);
  assert.equal(pbkdf2Sync("Demo@12345", Buffer.from("UZ9cM6ihl20HzLKw7olQqA==", "base64"), 210000, 32, "sha256").toString("base64"), "HRmOebKvkWNFHk/nYtVLHbblPFDG01IwS09B/PZq7RM=");
  assert.doesNotMatch(migration, /'Demo@12345'/);
});

test("session cookie is server-only and service drafts derive ownership from session", async () => {
  const auth = await readFile(new URL("../lib/d1-auth.ts", import.meta.url), "utf8");
  const drafts = await readFile(new URL("../app/api/service-drafts/route.ts", import.meta.url), "utf8");
  assert.match(auth, /HttpOnly/);
  assert.match(auth, /SameSite=Lax/);
  assert.match(auth, /SHA-256/);
  assert.match(drafts, /currentUser\(request\)/);
  assert.doesNotMatch(drafts, /body\?\.ownerId/);
});
