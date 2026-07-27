import pg, { type Pool, type PoolClient, type QueryResultRow } from "pg";

export type DatabaseRunResult = {
  meta: {
    changes: number;
    duration: number;
    last_row_id: number;
    rows_read: number;
    rows_written: number;
  };
  results: unknown[];
  success: boolean;
};

export interface DatabaseStatement {
  bind(...values: unknown[]): DatabaseStatement;
  first<T = Record<string, unknown>>(column?: string): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[]; success: boolean; meta: DatabaseRunResult["meta"] }>;
  run(): Promise<DatabaseRunResult>;
  raw<T = unknown[]>(): Promise<T[]>;
}

export interface ApplicationDatabase {
  prepare(sql: string): DatabaseStatement;
  batch<T = unknown>(statements: DatabaseStatement[]): Promise<T[]>;
  exec(sql: string): Promise<{ count: number; duration: number }>;
}

function postgresSql(source: string) {
  let parameter = 0;
  let quoted: "'" | '"' | "`" | null = null;
  let output = "";

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (quoted) {
      output += character;
      if (character === quoted) {
        if (source[index + 1] === quoted) output += source[++index];
        else quoted = null;
      }
      continue;
    }
    if (character === "'" || character === '"' || character === "`") {
      quoted = character;
      output += character === "`" ? '"' : character;
      continue;
    }
    if (character === "?") {
      output += `$${++parameter}`;
      continue;
    }
    output += character;
  }

  return output
    .replace(/\bAS\s+([a-z][A-Za-z0-9]*[A-Z][A-Za-z0-9]*)\b/g, 'AS "$1"')
    .replaceAll("lower(hex(randomblob(16)))", "replace(gen_random_uuid()::text,'-','')")
    .replace(/\bgroup_concat\(([^)]+)\)/gi, "string_agg($1, ',')")
    .replace(/\bINSERT\s+OR\s+IGNORE\s+INTO\b/gi, "INSERT INTO")
    .replace(/\bCOLLATE\s+NOCASE\b/gi, 'COLLATE "C"');
}

function meta(rowCount: number, duration: number): DatabaseRunResult["meta"] {
  return {
    changes: rowCount,
    duration,
    last_row_id: 0,
    rows_read: rowCount,
    rows_written: rowCount,
  };
}

class PostgresStatement implements DatabaseStatement {
  private values: unknown[] = [];

  constructor(
    private readonly pool: Pool,
    readonly sourceSql: string,
  ) {}

  bind(...values: unknown[]) {
    const statement = new PostgresStatement(this.pool, this.sourceSql);
    statement.values = values;
    return statement;
  }

  async execute(client?: PoolClient) {
    const started = performance.now();
    const executor = client ?? this.pool;
    const result = await executor.query(postgresSql(this.sourceSql), this.values);
    return { result, duration: performance.now() - started };
  }

  async first<T = Record<string, unknown>>(column?: string) {
    const { result } = await this.execute();
    const row = result.rows[0] as T | undefined;
    if (!row) return null;
    return column ? ((row as Record<string, unknown>)[column] as T) : row;
  }

  async all<T = Record<string, unknown>>() {
    const { result, duration } = await this.execute();
    return {
      results: result.rows as T[],
      success: true,
      meta: meta(result.rowCount ?? result.rows.length, duration),
    };
  }

  async run() {
    const { result, duration } = await this.execute();
    const count = result.rowCount ?? 0;
    return { meta: meta(count, duration), results: result.rows, success: true };
  }

  async raw<T = unknown[]>() {
    const { result } = await this.execute();
    return result.rows.map((row: QueryResultRow) => Object.values(row)) as T[];
  }
}

export class PostgresDatabase implements ApplicationDatabase {
  private readonly pool: Pool;

  constructor(connectionString: string) {
    this.pool = new pg.Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: Number(process.env.DATABASE_POOL_SIZE ?? 10),
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
      options: "-c search_path=nic_app,public -c statement_timeout=15000",
    });
  }

  prepare(sql: string) {
    return new PostgresStatement(this.pool, sql);
  }

  async batch<T = unknown>(statements: DatabaseStatement[]) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const results: unknown[] = [];
      for (const statement of statements) {
        if (!(statement instanceof PostgresStatement)) throw new Error("INVALID_DATABASE_STATEMENT");
        const { result, duration } = await statement.execute(client);
        results.push({
          results: result.rows,
          success: true,
          meta: meta(result.rowCount ?? result.rows.length, duration),
        });
      }
      await client.query("COMMIT");
      return results as T[];
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async exec(sql: string) {
    const started = performance.now();
    const result = await this.pool.query(sql);
    return { count: result.rowCount ?? 0, duration: performance.now() - started };
  }
}

let postgresDatabase: PostgresDatabase | null = null;

export function getPostgresDatabase() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return null;
  postgresDatabase ??= new PostgresDatabase(connectionString);
  return postgresDatabase;
}
