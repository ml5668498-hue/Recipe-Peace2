import { Request, Response, NextFunction } from "express";
import { getPool } from "../lib/db";

const TRIAL_DAYS = 14;

export function computeStatus(createdAt: string, premium: boolean): "trial" | "active" | "expired" {
  if (premium) return "active";
  const trialEnd = new Date(createdAt);
  trialEnd.setDate(trialEnd.getDate() + TRIAL_DAYS);
  return new Date() < trialEnd ? "trial" : "expired";
}

export function trialDaysLeft(createdAt: string): number {
  const trialEnd = new Date(createdAt);
  trialEnd.setDate(trialEnd.getDate() + TRIAL_DAYS);
  return Math.max(0, Math.ceil((trialEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
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
      "SELECT premium, created_at FROM users WHERE id = $1",
      [userId],
    );
    const user = result.rows[0];

    if (!user) {
      res.status(403).json({ error: "Usuario no encontrado.", code: "no_user" });
      return;
    }

    const status = computeStatus(user.created_at, user.premium);

    if (status === "trial" || status === "active") {
      next();
      return;
    }

    res.status(403).json({ error: "Tu prueba gratuita ha vencido.", code: "trial_expired" });
  } catch {
    res.status(500).json({ error: "Error al verificar acceso." });
  }
}
