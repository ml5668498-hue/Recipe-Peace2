import { Request, Response, NextFunction } from "express";
import { getPool } from "../lib/db";

export function computeStatus(trialEnd: string, premium: boolean): "trial" | "active" | "expired" {
  if (premium) return "active";
  return new Date() < new Date(trialEnd) ? "trial" : "expired";
}

export function trialDaysLeft(trialEnd: string): number {
  const end = new Date(trialEnd);
  return Math.max(0, Math.ceil((end.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
}

export async function requireSubscription(req: Request, res: Response, next: NextFunction): Promise<void> {
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
    const user = result.rows[0];

    if (!user) {
      res.status(403).json({ error: "Usuario no encontrado.", code: "no_user" });
      return;
    }

    const trialEnd = typeof user.trial_end === "string" ? user.trial_end : (user.trial_end as Date).toISOString();
    const status = computeStatus(trialEnd, user.premium);

    if (status === "trial" || status === "active") {
      next();
      return;
    }

    res.status(403).json({ error: "Tu prueba gratuita ha vencido.", code: "trial_expired" });
  } catch {
    res.status(500).json({ error: "Error al verificar acceso." });
  }
}
