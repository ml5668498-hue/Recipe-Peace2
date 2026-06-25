import { Router } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { getSupabaseClient } from "../../lib/supabase";
import { getPool } from "../../lib/db";
import { requireAuth } from "../../middleware/requireAuth";
import { computeStatus, trialDaysLeft } from "../../middleware/requireSubscription";

const router = Router();

const RegisterBody = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().max(500),
  password: z.string().min(6).max(100),
});

const LoginBody = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function generateToken(userId: string, email: string): string {
  return jwt.sign({ userId, email }, process.env["JWT_SECRET"]!, { expiresIn: "30d" });
}

function buildSubscription(trialStart: string, trialEnd: string, premium: boolean) {
  return {
    subscription_status: computeStatus(trialEnd, premium),
    premium,
    trial_start: trialStart,
    trial_end: trialEnd,
    days_left: trialDaysLeft(trialEnd),
  };
}

/**
 * Read subscription fields from Supabase public.users.
 * This is the admin-editable source of truth for trial_end and premium.
 * Returns null if the row doesn't exist or columns are missing.
 */
async function readSupabaseSubscription(id: string): Promise<{
  trial_end: string;
  premium: boolean;
  created_at: string;
} | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("users")
    .select("trial_end, premium, created_at")
    .eq("id", id)
    .single();

  if (error || !data) return null;

  const raw = data as Record<string, unknown>;
  if (!raw["trial_end"]) return null;

  return {
    trial_end: String(raw["trial_end"]),
    premium: Boolean(raw["premium"] ?? false),
    created_at: String(raw["created_at"] ?? new Date().toISOString()),
  };
}

/**
 * Write trial_end and premium back to Replit Postgres so requireSubscription
 * middleware (which reads Replit Postgres) stays in sync with Supabase changes.
 */
async function syncReplitDb(
  id: string,
  trialEnd: string,
  premium: boolean,
  log: typeof console,
): Promise<void> {
  const pool = getPool();
  await pool
    .query(
      `UPDATE users SET trial_end = $1, premium = $2 WHERE id = $3`,
      [trialEnd, premium, id],
    )
    .catch((err: unknown) => log.warn(`Replit DB sync failed: ${String(err)}`));
}

async function syncToSupabasePublicUsers(
  id: string,
  email: string,
  createdAt: string,
  trialEnd: string,
  premium: boolean,
  log: typeof console,
): Promise<void> {
  const supabase = getSupabaseClient();

  // Progressive fallback: drop columns until the upsert succeeds (handles missing cols)
  const payloads: Record<string, unknown>[] = [
    { id, email, created_at: createdAt, trial_end: trialEnd, premium },
    { id, email, created_at: createdAt, premium },
    { id, email, created_at: createdAt },
    { id, email },
  ];

  for (const payload of payloads) {
    const { error } = await supabase
      .from("users")
      .upsert(payload, { onConflict: "id" });

    if (!error) return;

    // PGRST204 = column not found → retry without that column
    if (error.code === "PGRST204") continue;

    log.warn(`Supabase public.users sync failed: ${error.message}`);
    return;
  }

  log.warn("Supabase public.users sync exhausted all attempts");
}

router.post("/auth/register", async (req, res): Promise<void> => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Nombre, email válido y contraseña (mín. 6 caracteres) son requeridos." });
    return;
  }

  const { name, email, password } = parsed.data;
  const normalizedEmail = email.toLowerCase().trim();
  const supabase = getSupabaseClient();

  const now = new Date();
  const trialEnd = new Date(now);
  trialEnd.setDate(trialEnd.getDate() + 14);
  const trialStartIso = now.toISOString();
  const trialEndIso = trialEnd.toISOString();

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: normalizedEmail,
    password,
    email_confirm: true,
    user_metadata: {
      name,
      premium: false,
      trial_start: trialStartIso,
      trial_end: trialEndIso,
    },
  });

  if (authError || !authData?.user) {
    req.log.error({ error: authError }, "Failed to create user in Supabase Auth");
    const msg = authError?.message ?? "";
    if (msg.includes("already registered") || msg.includes("already been registered") || (authError as { status?: number })?.status === 422) {
      res.status(409).json({ error: "Este email ya está registrado. Iniciá sesión." });
    } else {
      res.status(500).json({ error: "Error al crear el usuario." });
    }
    return;
  }

  const supabaseUser = authData.user;
  const pool = getPool();

  try {
    await pool.query(
      `INSERT INTO users (id, name, email, premium, trial_start, trial_end, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $5)
       ON CONFLICT (email) DO UPDATE
         SET name = EXCLUDED.name, trial_start = EXCLUDED.trial_start, trial_end = EXCLUDED.trial_end`,
      [supabaseUser.id, name, normalizedEmail, false, trialStartIso, trialEndIso],
    );
  } catch (dbErr) {
    req.log.warn({ error: dbErr }, "Replit DB sync failed (non-fatal)");
  }

  await syncToSupabasePublicUsers(supabaseUser.id, normalizedEmail, trialStartIso, trialEndIso, false, req.log as unknown as typeof console);

  const token = generateToken(supabaseUser.id, normalizedEmail);

  res.status(201).json({
    token,
    user: { id: supabaseUser.id, name, email: normalizedEmail },
    subscription: buildSubscription(trialStartIso, trialEndIso, false),
  });
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Email y contraseña requeridos." });
    return;
  }

  const { email, password } = parsed.data;
  const normalizedEmail = email.toLowerCase().trim();
  const supabase = getSupabaseClient();

  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  });

  if (signInError || !signInData?.user) {
    res.status(401).json({ error: "Email o contraseña incorrectos." });
    return;
  }

  const supabaseUser = signInData.user;
  const meta = supabaseUser.user_metadata as {
    name?: string;
    premium?: boolean;
    trial_start?: string;
    trial_end?: string;
  };

  const pool = getPool();

  // 1. Supabase public.users is the admin-editable source of truth for
  //    trial_end and premium — read it first so admin changes take effect
  //    immediately on the next login.
  const supa = await readSupabaseSubscription(supabaseUser.id);

  // 2. Replit Postgres holds name + trial_start (not in Supabase public.users)
  const dbResult = await pool.query(
    "SELECT id, name, email, premium, trial_start, trial_end FROM users WHERE id = $1",
    [supabaseUser.id],
  ).catch(() => ({ rows: [] as Array<{ id: string; name: string; email: string; premium: boolean; trial_start: string; trial_end: string }> }));

  const dbRow = dbResult.rows[0];

  const name: string = dbRow?.name ?? meta.name ?? normalizedEmail.split("@")[0];

  const trialStart: string = dbRow
    ? (typeof dbRow.trial_start === "string" ? dbRow.trial_start : (dbRow.trial_start as Date).toISOString())
    : (meta.trial_start ?? supabaseUser.created_at);

  // Supabase public.users wins for trial_end + premium (admin can edit there)
  const trialEnd: string = supa?.trial_end
    ?? (dbRow ? (typeof dbRow.trial_end === "string" ? dbRow.trial_end : (dbRow.trial_end as Date).toISOString()) : null)
    ?? meta.trial_end
    ?? (() => { const d = new Date(supabaseUser.created_at); d.setDate(d.getDate() + 14); return d.toISOString(); })();

  const premium: boolean = supa?.premium
    ?? dbRow?.premium
    ?? meta.premium
    ?? false;

  // 3. Keep Replit Postgres in sync so requireSubscription middleware sees
  //    the latest trial_end / premium from Supabase.
  if (supa) {
    syncReplitDb(supabaseUser.id, supa.trial_end, supa.premium, req.log as unknown as typeof console).catch(() => {});
  }

  const token = generateToken(supabaseUser.id, normalizedEmail);

  res.json({
    token,
    user: { id: supabaseUser.id, name, email: normalizedEmail },
    subscription: buildSubscription(trialStart, trialEnd, premium),
  });
});

router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const pool = getPool();

  // Read both sources in parallel
  const [dbResult, supa] = await Promise.all([
    pool.query(
      "SELECT id, name, email, premium, trial_start, trial_end FROM users WHERE id = $1",
      [req.userId],
    ).catch(() => ({ rows: [] as Array<{ id: string; name: string; email: string; premium: boolean; trial_start: string | Date; trial_end: string | Date }> })),
    readSupabaseSubscription(req.userId!),
  ]);

  const dbRow = dbResult.rows[0];

  if (!dbRow && !supa) {
    res.status(404).json({ error: "Usuario no encontrado." });
    return;
  }

  const trialStart = dbRow
    ? (typeof dbRow.trial_start === "string" ? dbRow.trial_start : (dbRow.trial_start as Date).toISOString())
    : supa!.created_at;

  // Supabase public.users wins for trial_end + premium
  const trialEnd = supa?.trial_end
    ?? (dbRow ? (typeof dbRow.trial_end === "string" ? dbRow.trial_end : (dbRow.trial_end as Date).toISOString()) : null)
    ?? (() => { const d = new Date(trialStart); d.setDate(d.getDate() + 14); return d.toISOString(); })();

  const premium = supa?.premium ?? dbRow?.premium ?? false;

  const name = dbRow?.name ?? dbRow?.email?.split("@")[0] ?? "Usuario";
  const email = dbRow?.email ?? req.userId!;

  // Sync Replit Postgres if Supabase has newer values
  if (supa) {
    syncReplitDb(req.userId!, supa.trial_end, supa.premium, req.log as unknown as typeof console).catch(() => {});
  }

  res.json({
    user: { id: req.userId!, name, email },
    subscription: buildSubscription(trialStart, trialEnd, premium),
  });
});

export default router;
