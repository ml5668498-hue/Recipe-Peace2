/**
 * GET /api/setup — checks whether the Supabase premium tables exist.
 * Returns { ready: true } if all tables exist, or { ready: false, sql: "..." }
 * with the SQL to paste into the Supabase SQL Editor.
 *
 * Public route — no auth required (used by frontend to show setup banner).
 */
import { Router, type IRouter } from "express";
import { getSupabaseClient } from "../../lib/supabase";
import { SUPABASE_SCHEMA_SQL } from "../userdata/sql";

const router: IRouter = Router();

const REQUIRED_TABLES = [
  "recipe_history",
  "favorite_recipes",
  "weekly_planner",
  "shopping_lists",
] as const;

router.get("/setup/status", async (_req, res): Promise<void> => {
  try {
    const supabase = getSupabaseClient();
    const checks = await Promise.all(
      REQUIRED_TABLES.map(async (table) => {
        const { error } = await supabase.from(table).select("id").limit(0);
        return { table, ok: !error };
      })
    );

    const missing = checks.filter((c) => !c.ok).map((c) => c.table);
    const ready = missing.length === 0;

    res.json({
      ready,
      missing,
      sql: ready ? null : SUPABASE_SCHEMA_SQL,
    });
  } catch {
    res.json({ ready: false, missing: REQUIRED_TABLES, sql: SUPABASE_SCHEMA_SQL });
  }
});

export default router;
