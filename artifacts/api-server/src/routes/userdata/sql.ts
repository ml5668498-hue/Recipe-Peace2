/**
 * SQL to run in Supabase SQL Editor (supabase.com → SQL Editor).
 * Creates all 4 tables required for premium features.
 *
 * Run this ONCE in your Supabase project.
 */
export const SUPABASE_SCHEMA_SQL = /* sql */ `
-- ─────────────────────────────────────────────────────────────────
-- Recetario de la Paz — Premium tables
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql
-- ─────────────────────────────────────────────────────────────────

-- 1. recipe_history — auto-saves every generated recipe
CREATE TABLE IF NOT EXISTS recipe_history (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  used_ingredients  TEXT[] NOT NULL DEFAULT '{}',
  steps             TEXT[] NOT NULL DEFAULT '{}',
  estimated_time    TEXT NOT NULL DEFAULT '',
  difficulty        TEXT NOT NULL DEFAULT 'Fácil',
  anti_anxiety_tip  TEXT NOT NULL DEFAULT '',
  objetivo          TEXT,
  is_favorite       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS recipe_history_user_id_idx ON recipe_history(user_id);
ALTER TABLE recipe_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage their own history" ON recipe_history;
CREATE POLICY "Users manage their own history" ON recipe_history
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 2. favorite_recipes — recipes marked as favorites (synced from recipe_history)
CREATE TABLE IF NOT EXISTS favorite_recipes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  history_id        UUID REFERENCES recipe_history(id) ON DELETE SET NULL,
  name              TEXT NOT NULL,
  used_ingredients  TEXT[] NOT NULL DEFAULT '{}',
  steps             TEXT[] NOT NULL DEFAULT '{}',
  estimated_time    TEXT NOT NULL DEFAULT '',
  difficulty        TEXT NOT NULL DEFAULT 'Fácil',
  anti_anxiety_tip  TEXT NOT NULL DEFAULT '',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS favorite_recipes_user_id_idx ON favorite_recipes(user_id);
ALTER TABLE favorite_recipes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage their own favorites" ON favorite_recipes;
CREATE POLICY "Users manage their own favorites" ON favorite_recipes
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 3. weekly_planner — saved weekly meal plans
CREATE TABLE IF NOT EXISTS weekly_planner (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title                    TEXT NOT NULL DEFAULT 'Planner semanal',
  days                     JSONB NOT NULL DEFAULT '[]',
  weekly_savings_message   TEXT NOT NULL DEFAULT '',
  is_favorite              BOOLEAN NOT NULL DEFAULT FALSE,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS weekly_planner_user_id_idx ON weekly_planner(user_id);
ALTER TABLE weekly_planner ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage their own planners" ON weekly_planner;
CREATE POLICY "Users manage their own planners" ON weekly_planner
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 4. shopping_lists — auto-generated from weekly_planner
CREATE TABLE IF NOT EXISTS shopping_lists (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  planner_id  UUID REFERENCES weekly_planner(id) ON DELETE CASCADE,
  categories  JSONB NOT NULL DEFAULT '[]',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS shopping_lists_user_id_idx ON shopping_lists(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS shopping_lists_planner_id_idx ON shopping_lists(planner_id);
ALTER TABLE shopping_lists ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage their own shopping lists" ON shopping_lists;
CREATE POLICY "Users manage their own shopping lists" ON shopping_lists
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
`;
