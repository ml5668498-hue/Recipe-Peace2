import { Router, type Request } from "express";
import { requireAuth } from "../../middleware/requireAuth";
import { getPool } from "../../lib/db";
import { computeStatus, trialDaysLeft } from "../../middleware/requireSubscription";

const router = Router();
const MP_API = "https://api.mercadopago.com";
const PREMIUM_AMOUNT_ARS = 7000;

function getAppBaseUrl(req: Request): string {
  const configuredUrl = process.env["APP_BASE_URL"]?.trim();
  if (configuredUrl) return configuredUrl.replace(/\/+$/, "");

  const forwardedProtocol = req.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const forwardedHost = req.get("x-forwarded-host")?.split(",")[0]?.trim();
  const protocol = forwardedProtocol || req.protocol;
  const host = forwardedHost || req.get("host");

  if (!host) {
    throw new Error("Unable to determine the app URL for Mercado Pago back_url");
  }

  return `${protocol}://${host}`;
}

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

router.post("/subscriptions/checkout", requireAuth, async (req, res): Promise<void> => {
  const mpToken = process.env["MERCADOPAGO_ACCESS_TOKEN"];
  if (!mpToken) {
    res.status(503).json({
      error: "Pagos no disponibles aún. La integración con Mercado Pago está en configuración.",
      code: "mp_not_configured",
    });
    return;
  }

  if (!req.userId || !req.userEmail) {
    res.status(400).json({
      error: "No se pudo identificar el email del usuario.",
      code: "missing_user_data",
    });
    return;
  }

  let backUrl: string;
  try {
    backUrl = `${getAppBaseUrl(req)}/upgrade`;
  } catch (err) {
    req.log.error({ err }, "Unable to build Mercado Pago back_url");
    res.status(500).json({
      error: "No se pudo configurar la URL de retorno del pago.",
      code: "invalid_back_url",
    });
    return;
  }

  const requestBody = {
    reason: "Recetario de la Paz Premium",
    external_reference: req.userId,
    payer_email: req.userEmail,
    auto_recurring: {
      frequency: 1,
      frequency_type: "months",
      transaction_amount: PREMIUM_AMOUNT_ARS,
      currency_id: "ARS",
      free_trial: {
        frequency: 14,
        frequency_type: "days",
      },
    },
    back_url: backUrl,
  };

  try {
    const mpResponse = await fetch(`${MP_API}/preapproval`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${mpToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const responseBody = (await mpResponse.json().catch(() => null)) as
      | Record<string, unknown>
      | null;

    if (!mpResponse.ok) {
      req.log.error(
        { status: mpResponse.status, response: responseBody },
        "Mercado Pago subscription creation failed",
      );
      res.status(502).json({
        error: "Mercado Pago no pudo crear la suscripción.",
        code: "mercadopago_error",
      });
      return;
    }

    const initPoint = responseBody?.["init_point"];
    if (typeof initPoint !== "string" || !initPoint) {
      req.log.error(
        { response: responseBody },
        "Mercado Pago response did not include init_point",
      );
      res.status(502).json({
        error: "Mercado Pago no devolvió una URL de pago.",
        code: "missing_init_point",
      });
      return;
    }

    req.log.info(
      { userId: req.userId, subscriptionId: responseBody?.["id"] },
      "Mercado Pago subscription checkout created",
    );
    res.json({ init_point: initPoint });
  } catch (err) {
    req.log.error({ err }, "Mercado Pago subscription request failed");
    res.status(502).json({
      error: "No se pudo conectar con Mercado Pago.",
      code: "mercadopago_unavailable",
    });
  }
});

export default router;
