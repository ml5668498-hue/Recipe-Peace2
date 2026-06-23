import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth";
import { getSupabaseClient } from "../../lib/supabase";

const router = Router();

router.get("/subscriptions/status", requireAuth, async (req, res): Promise<void> => {
  const supabase = getSupabaseClient();
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("subscription_status, trial_start, trial_end, mp_preapproval_id, current_period_end, created_at, updated_at")
    .eq("user_id", req.userId!)
    .single();

  if (!sub) {
    res.status(404).json({ error: "Suscripción no encontrada." });
    return;
  }

  // Expire trial if past trial_end
  if (sub.subscription_status === "trial" && new Date() > new Date(sub.trial_end)) {
    await supabase
      .from("subscriptions")
      .update({ subscription_status: "expired" })
      .eq("user_id", req.userId!);
    sub.subscription_status = "expired";
  }

  res.json(sub);
});

// Placeholder endpoint for future Mercado Pago checkout
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
