import { Request, Response, NextFunction } from "express";
import { getPool } from "../lib/db";
import { getSupabaseClient } from "../lib/supabase";

export function computeStatus(trialEnd: string, premium: boolean): "trial" | "active" | "expired" {
  if (premium) return "active";
  return new Date() < new Date(trialEnd) ? "trial" : "expired";
}

export function trialDaysLeft(trialEnd: string): number {
  const end = new Date(trialEnd);
  return Math.max(0, Math.ceil((end.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
}

/**
 * Read subscription fields from Supabase public.users.
 * Used as fallback when the user row is missing from Replit Postgres
 * (e.g. user was created directly in Supabase dashboard or INSERT failed).
 */
async function readFromSupabase(
  id: string,
): Promise<{ premium: boolean; trial_end: string } | null> {
  try {
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
      premium: Boolean(raw["premium"] ?? false),
      trial_end: String(raw["trial_end"]),
    };
  } catch {
    return null;
  }
}

/**
 * Upsert user into Replit Postgres so future requireSubscription calls
 * are satisfied without hitting Supabase again.
 */
async function upsertReplitDb(
  id: string,
  email: string,
  premium: boolean,
  trialEnd: string,
): Promise<void> {
  try {
    const pool = getPool();
    const now = new Date().toISOString();
    const d = new Date(trialEnd);
    d.setDate(d.getDate() - 14);
    const trialStart = d.toISOString();

    await pool.query(
      `INSERT INTO users (id, name, email, premium, trial_start, trial_end, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO UPDATE
         SET premium = EXCLUDED.premium,
             trial_end = EXCLUDED.trial_end,
             email = EXCLUDED.email`,
      [id, email.split("@")[0], email, premium, trialStart, trialEnd, now],
    );
  } catch {
    // Non-fatal — next request will try again
  }
}

export async function requireSubscription(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const userId = req.userId;
  if (!userId) {
    res.status(401).json({ error: "No autenticado." });
    return;
  }

  try {
    const pool = getPool();
    const result = await pool.query(
      "SELECT premium, trial_start, trial_end FROM users WHERE id = $1",
      [userId],
    );

    let premium: boolean;
    let trialEnd: string;

    if (result.rows[0]) {
      // ── Fast path: user found in Replit Postgres ─────────────────
      const row = result.rows[0] as { premium: boolean; trial_end: string | Date };
      premium = row.premium;
      trialEnd =
        typeof row.trial_end === "string"
          ? row.trial_end
          : (row.trial_end as Date).toISOString();
    } else {
      // ── Fallback: user not in Replit Postgres → try Supabase ─────
      // This happens when a user was created directly in Supabase dashboard
      // or when the Replit DB INSERT failed silently during registration.
      const supa = await readFromSupabase(userId);

      if (!supa) {
        res.status(403).json({
          error: "Usuario no encontrado. Intentá cerrar sesión e iniciar sesión de nuevo.",
          code: "no_user",
        });
        return;
      }

      premium = supa.premium;
      trialEnd = supa.trial_end;

      // Auto-repair: insert into Replit Postgres so future calls hit the fast path
      const email = req.userEmail ?? `${userId}@unknown`;
      upsertReplitDb(userId, email, premium, trialEnd).catch(() => {});
    }

    const status = computeStatus(trialEnd, premium);

    if (status === "trial" || status === "active") {
      next();
      return;
    }

    res.status(403).json({
      error: "Tu prueba gratuita ha vencido. Activá Premium para continuar.",
      code: "trial_expired",
    });
  } catch (err) {
    res.status(500).json({ error: "Error al verificar acceso." });
  }
}
