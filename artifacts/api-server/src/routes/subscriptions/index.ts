import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth";
import { getPool } from "../../lib/db";
import { computeStatus, trialDaysLeft } from "../../middleware/requireSubscription";

const router = Router();

router.get("/subscriptions/status", requireAuth, async (req, res): Promise<void> => {
  const pool = getPool();

  const result = await pool.query(
    "SELECT premium, trial_start, trial_end FROM users WHERE id = $1",
    [req.userId],
  ).catch(() => ({ rows: [] as Array<{ premium: boolean; trial_start: Date; trial_end: Date }> }));

  const user = result.rows[0];

  if (!user) {
    res.status(404).json({ error: "Usuario no encontrado." });
    return;
  }

  const trialStart = typeof user.trial_start === "string" ? user.trial_start : (user.trial_start as Date).toISOString();
  const trialEnd   = typeof user.trial_end   === "string" ? user.trial_end   : (user.trial_end   as Date).toISOString();

  res.json({
    subscription_status: computeStatus(trialEnd, user.premium),
    premium: user.premium,
    trial_start: trialStart,
    trial_end: trialEnd,
    days_left: trialDaysLeft(trialEnd),
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
