import { Router } from "express";
import { getSupabaseClient } from "../../lib/supabase";

const router = Router();
const MP_API = "https://api.mercadopago.com";

// Webhook de Mercado Pago — activa premium=true cuando el pago se autoriza
router.post("/webhooks/mercadopago", async (req, res): Promise<void> => {
  res.json({ ok: true }); // Respond immediately to avoid MP retries

  const { type, data } = req.body as { type?: string; data?: { id?: string } };
  req.log.info({ type, dataId: data?.id }, "MP webhook received");

  if (type !== "subscription_preapproval" || !data?.id) return;

  const mpToken = process.env["MERCADOPAGO_ACCESS_TOKEN"];
  if (!mpToken) {
    req.log.warn("MERCADOPAGO_ACCESS_TOKEN not configured — skipping webhook");
    return;
  }

  try {
    const mpRes = await fetch(`${MP_API}/preapproval/${data.id}`, {
      headers: { Authorization: `Bearer ${mpToken}` },
    });
    const preapproval = (await mpRes.json()) as Record<string, unknown>;

    if (!mpRes.ok) {
      req.log.error({ preapproval }, "Failed to fetch MP preapproval");
      return;
    }

    const mpStatus = preapproval["status"] as string;
    const userId = preapproval["external_reference"] as string;

    if (!userId) {
      req.log.warn({ preapprovalId: data.id }, "Missing external_reference in MP preapproval");
      return;
    }

    const supabase = getSupabaseClient();

    // authorized = active subscription → set premium=true
    // paused/cancelled = payment failed or cancelled → set premium=false
    const premium = mpStatus === "authorized";

    await supabase.from("users").update({ premium }).eq("id", userId);

    req.log.info({ userId, mpStatus, premium }, "User premium status updated from webhook");
  } catch (err) {
    req.log.error({ err }, "Webhook processing error");
  }
});

export default router;
