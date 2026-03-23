import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { promises as fs } from "fs";
import * as path from "path";
import { Pool, PoolClient, QueryResultRow } from "pg";
import { newDb } from "pg-mem";

type Queryable = Pick<Pool, "query">;

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private pool!: Pool;
  private mode: "postgres" | "pg-mem" = "pg-mem";

  constructor(config?: { pool: Pool }) {
    if (config?.pool) {
      this.pool = config.pool;
    }
  }

  async onModuleInit() {
    if (!this.pool) {
      this.pool = this.createPool();
    }
    await this.runMigrations();
  }

  async onModuleDestroy() {
    if (this.pool) {
      await this.pool.end();
    }
  }

  isPersistent() {
    return this.mode === "postgres";
  }

  async query<T extends QueryResultRow>(text: string, params: unknown[] = []) {
    return this.pool.query<T>(text, params);
  }

  async withTransaction<T>(runner: (client: PoolClient) => Promise<T>) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await runner(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async runMigrations(target: Queryable = this.pool) {
    const schemaMigrationsExists = await target.query<{ exists: boolean }>(
      `
        SELECT EXISTS (
          SELECT 1
          FROM information_schema.tables
          WHERE table_schema = 'public'
            AND table_name = 'schema_migrations'
        ) AS exists
      `
    );

    if (!schemaMigrationsExists.rows[0]?.exists) {
      await target.query(`
        CREATE TABLE schema_migrations (
          name TEXT PRIMARY KEY,
          applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
    }

    const migrationsDir = path.join(process.cwd(), "migrations");
    const files = (await fs.readdir(migrationsDir)).filter((entry) => entry.endsWith(".sql")).sort();
    const appliedRows = await target.query<{ name: string }>("SELECT name FROM schema_migrations");
    const applied = new Set(appliedRows.rows.map((row) => row.name));

    for (const file of files) {
      if (applied.has(file)) {
        continue;
      }

      const sql = await fs.readFile(path.join(migrationsDir, file), "utf8");
      await target.query(sql);
      await target.query("INSERT INTO schema_migrations (name) VALUES ($1)", [file]);
    }
  }

  private createPool() {
    if (process.env.DATABASE_URL) {
      this.mode = "postgres";
      return new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined
      });
    }

    this.mode = "pg-mem";
    const db = newDb({
      autoCreateForeignKeyIndices: true
    });
    const adapter = db.adapters.createPg();
    return new adapter.Pool();
  }
}
