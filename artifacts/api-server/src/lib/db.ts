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
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_end   TIMESTAMPTZ`,
    `ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL`,
  ];

  for (const sql of alterations) {
    await pool.query(sql).catch(() => {});
  }

  await pool.query(`
    UPDATE users
    SET trial_end = trial_start + INTERVAL '14 days'
    WHERE trial_end IS NULL
  `).catch(() => {});

  await pool.query(`
    ALTER TABLE users ALTER COLUMN trial_end SET NOT NULL
  `).catch(() => {});

  // saved_entries — persists recipes, menus, planners per user
  await pool.query(`
    CREATE TABLE IF NOT EXISTS saved_entries (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id     UUID NOT NULL,
      type        TEXT NOT NULL CHECK (type IN ('recipe', 'menu', 'planner')),
      title       TEXT NOT NULL,
      data        JSONB NOT NULL,
      is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS saved_entries_user_id_idx ON saved_entries(user_id);
  `).catch(() => {});

  logger.info("Database migrations complete");
}
