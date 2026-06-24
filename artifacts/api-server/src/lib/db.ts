import pg from "pg";
import { logger } from "./logger";

const { Pool } = pg;

let _pool: pg.Pool | null = null;

export function getPool(): pg.Pool {
  if (!_pool) {
    const connectionString = process.env["DATABASE_URL"];
    if (!connectionString) {
      throw new Error("DATABASE_URL env var is required");
    }
    _pool = new Pool({ connectionString });
    _pool.on("error", (err) => {
      logger.error({ err }, "Unexpected error on idle pg client");
    });
  }
  return _pool;
}

export async function runMigrations(): Promise<void> {
  const pool = getPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name        TEXT NOT NULL,
      email       TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      premium     BOOLEAN NOT NULL DEFAULT FALSE,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  logger.info("Database migrations complete");
}
