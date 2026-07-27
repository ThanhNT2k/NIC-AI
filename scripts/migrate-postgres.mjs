import pg from "pg";
import { readFile } from "node:fs/promises";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");

const migration = await readFile(
  new URL("../supabase/postgres/0001_nic_app.sql", import.meta.url),
  "utf8",
);
const dryRun = process.argv.includes("--dry-run");
const sql = dryRun ? migration.replace(/COMMIT;\s*$/, "ROLLBACK;") : migration;
const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

await client.connect();
try {
  await client.query(sql);
  const result = await client.query(
    "select count(1)::int as tables from information_schema.tables where table_schema = 'nic_app'",
  );
  console.log(JSON.stringify({
    migration: dryRun ? "dry-run" : "applied",
    tables: result.rows[0].tables,
  }));
} finally {
  await client.end();
}
