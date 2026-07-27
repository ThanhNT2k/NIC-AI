import pg from "pg";
import { readFile, rename, writeFile } from "node:fs/promises";

const environmentFile = process.argv[2] ?? "/etc/nic-erp.env";
const shouldWrite = process.argv.includes("--write");
const contents = await readFile(environmentFile, "utf8");
const variables = Object.fromEntries(
  contents
    .split(/\r?\n/)
    .filter((line) => /^[A-Za-z_][A-Za-z0-9_]*=/.test(line))
    .map((line) => line.split(/=(.*)/s).slice(0, 2)),
);
if (!variables.DATABASE_URL || !variables.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error("DATABASE_URL and NEXT_PUBLIC_SUPABASE_URL are required.");
}

const connection = new URL(variables.DATABASE_URL);
const projectRef = new URL(variables.NEXT_PUBLIC_SUPABASE_URL).hostname.split(".")[0];
connection.port = process.env.SUPABASE_POOLER_PORT ?? "6543";
connection.username = `postgres.${projectRef}`;

const regionHosts = process.env.SUPABASE_POOLER_HOST
  ? [process.env.SUPABASE_POOLER_HOST]
  : [
      "ap-southeast-1", "ap-southeast-2", "ap-northeast-1", "ap-northeast-2",
      "ap-south-1", "eu-central-1", "eu-west-1", "eu-west-2",
      "us-east-1", "us-west-1", "us-west-2", "ca-central-1", "sa-east-1",
    ].map((region) => `aws-0-${region}.pooler.supabase.com`);

let connected = false;
let lastError;
for (const host of regionHosts) {
  connection.hostname = host;
  const client = new pg.Client({
    connectionString: connection.toString(),
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5_000,
  });
  try {
    await client.connect();
    await client.query("select 1");
    connected = true;
    break;
  } catch (error) {
    lastError = error;
  } finally {
    await client.end().catch(() => undefined);
  }
}
if (!connected) throw lastError ?? new Error("SUPABASE_POOLER_NOT_FOUND");

if (shouldWrite) {
  const replacement = contents.replace(
    /^DATABASE_URL=.*$/m,
    `DATABASE_URL=${connection.toString()}`,
  );
  const temporary = `${environmentFile}.next`;
  await writeFile(temporary, replacement, { encoding: "utf8", mode: 0o640 });
  await rename(temporary, environmentFile);
}

console.log(JSON.stringify({
  connected: true,
  poolerHost: connection.hostname,
  poolerPort: connection.port,
  environmentUpdated: shouldWrite,
}));
