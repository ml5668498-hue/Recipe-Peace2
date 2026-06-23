import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth";
import { getSupabaseClient } from "../../lib/supabase";
import { computeStatus, trialDaysLeft } from "../../middleware/requireSubscription";

const router = Router();

router.get("/subscriptions/status", requireAuth, async (req, res): Promise<void> => {
  const supabase = getSupabaseClient();

  const { data: user } = await supabase
    .from("users")
    .select("premium, created_at")
    .eq("id", req.userId!)
    .single();

  if (!user) {
    res.status(404).json({ error: "Usuario no encontrado." });
    return;
  }

  const trialEnd = new Date(user.created_at);
  trialEnd.setDate(trialEnd.getDate() + 14);

  res.json({
    subscription_status: computeStatus(user.created_at, user.premium),
    premium: user.premium,
    trial_start: user.created_at,
    trial_end: trialEnd.toISOString(),
    days_left: trialDaysLeft(user.created_at),
  });
});

// Placeholder for future Mercado Pago checkout
router.post("/subscriptions/checkout", requireAuth, async (req, res): Promise<void> => {
  const mpToken = process.env["MERCADOPAGO_ACCESS_TOKEN"];
  if (!mpToken) {
    res.status(503).json({
      error: "Pagos no disponibles aún. La integración con Mercado Pago está en configuración.",
      code: "mp_not_configured",
    });
    return;
  }
  res.status(501).json({ error: "Checkout no implementado aún.", code: "not_implemented" });
});

export default router;
