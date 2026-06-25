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
  const dbResult = await pool.query(
    "SELECT id, name, email, premium, trial_start, trial_end FROM users WHERE id = $1",
    [supabaseUser.id],
  ).catch(() => ({ rows: [] as Array<{ id: string; name: string; email: string; premium: boolean; trial_start: string; trial_end: string }> }));

  let name: string;
  let premium: boolean;
  let trialStart: string;
  let trialEnd: string;

  if (dbResult.rows.length > 0) {
    const row = dbResult.rows[0];
    name = row.name;
    premium = row.premium;
    trialStart = typeof row.trial_start === "string" ? row.trial_start : (row.trial_start as Date).toISOString();
    trialEnd = typeof row.trial_end === "string" ? row.trial_end : (row.trial_end as Date).toISOString();
  } else {
    name = meta.name ?? normalizedEmail.split("@")[0];
    premium = meta.premium ?? false;
    trialStart = meta.trial_start ?? supabaseUser.created_at;
    trialEnd = meta.trial_end ?? (() => {
      const d = new Date(supabaseUser.created_at);
      d.setDate(d.getDate() + 14);
      return d.toISOString();
    })();
  }

  // Best-effort: ensure user exists in Supabase public.users (handles users
  // who registered before sync was added, or if a previous sync failed)
  syncToSupabasePublicUsers(
    supabaseUser.id,
    normalizedEmail,
    trialStart,
    trialEnd,
    premium,
    req.log as unknown as typeof console,
  ).catch(() => {});

  const token = generateToken(supabaseUser.id, normalizedEmail);

  res.json({
    token,
    user: { id: supabaseUser.id, name, email: normalizedEmail },
    subscription: buildSubscription(trialStart, trialEnd, premium),
  });
});

router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const pool = getPool();

  const dbResult = await pool.query(
    "SELECT id, name, email, premium, trial_start, trial_end FROM users WHERE id = $1",
    [req.userId],
  ).catch(() => ({ rows: [] as Array<{ id: string; name: string; email: string; premium: boolean; trial_start: string | Date; trial_end: string | Date }> }));

  if (dbResult.rows.length > 0) {
    const user = dbResult.rows[0];
    const trialStart = typeof user.trial_start === "string" ? user.trial_start : (user.trial_start as Date).toISOString();
    const trialEnd = typeof user.trial_end === "string" ? user.trial_end : (user.trial_end as Date).toISOString();
    res.json({
      user: { id: user.id, name: user.name, email: user.email },
      subscription: buildSubscription(trialStart, trialEnd, user.premium),
    });
    return;
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.admin.getUserById(req.userId!);

  if (error || !data?.user) {
    res.status(404).json({ error: "Usuario no encontrado." });
    return;
  }

  const meta = data.user.user_metadata as {
    name?: string;
    premium?: boolean;
    trial_start?: string;
    trial_end?: string;
  };
  const name = meta.name ?? data.user.email?.split("@")[0] ?? "Usuario";
  const premium = meta.premium ?? false;
  const trialStart = meta.trial_start ?? data.user.created_at;
  const trialEnd = meta.trial_end ?? (() => {
    const d = new Date(data.user.created_at);
    d.setDate(d.getDate() + 14);
    return d.toISOString();
  })();

  res.json({
    user: { id: data.user.id, name, email: data.user.email },
    subscription: buildSubscription(trialStart, trialEnd, premium),
  });
});

export default router;
