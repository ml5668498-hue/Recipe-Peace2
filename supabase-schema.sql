-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard)
-- Project → SQL Editor → New query → paste and run

CREATE TABLE IF NOT EXISTS waitlist (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL DEFAULT '',
  email text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Optional: disable Row Level Security so the service role can read/write freely
ALTER TABLE waitlist DISABLE ROW LEVEL SECURITY;
