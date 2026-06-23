import { Request, Response, NextFunction } from "express";
import { getSupabaseClient } from "../lib/supabase";

export async function requireSubscription(req: Request, res: Response, next: NextFunction): Promise<void> {
  const userId = req.userId;
  if (!userId) {
    res.status(401).json({ error: "No autenticado." });
    return;
  }

  try {
    const supabase = getSupabaseClient();
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("subscription_status, trial_end")
      .eq("user_id", userId)
      .single();

    if (!sub) {
      res.status(403).json({ error: "Sin suscripción activa.", code: "no_subscription" });
      return;
    }

    if (sub.subscription_status === "trial") {
      if (new Date() > new Date(sub.trial_end)) {
        await supabase
          .from("subscriptions")
          .update({ subscription_status: "expired" })
          .eq("user_id", userId);
        res.status(403).json({ error: "Tu prueba gratuita ha vencido.", code: "trial_expired" });
        return;
      }
      next();
      return;
    }

    if (sub.subscription_status === "active") {
      next();
      return;
    }

    // expired or any other state
    res.status(403).json({ error: "Suscripción vencida.", code: sub.subscription_status });
  } catch {
    res.status(500).json({ error: "Error al verificar suscripción." });
  }
}
