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
      id          UUID PRIMARY KEY,
      name        TEXT NOT NULL,
      email       TEXT NOT NULL UNIQUE,
      premium     BOOLEAN NOT NULL DEFAULT FALSE,
      trial_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      trial_end   TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '14 days'),
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  const alterations = [
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_start TIMESTAMPTZ NOT NULL DEFAULT NOW()`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_end   TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '14 days')`,
    `ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL`,
  ];

  for (const sql of alterations) {
    await pool.query(sql).catch(() => {});
  }

  logger.info("Database migrations complete");
}
