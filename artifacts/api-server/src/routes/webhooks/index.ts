import { Router } from "express";
import { getSupabaseClient } from "../../lib/supabase";

const router = Router();
const MP_API = "https://api.mercadopago.com";

// Maps Mercado Pago preapproval status → our subscription_status
const MP_STATUS_MAP: Record<string, string> = {
  authorized: "active",
  paused: "expired",
  cancelled: "expired",
  pending: "trial",
};

// Placeholder webhook — will be wired to Mercado Pago once MP account is configured
router.post("/webhooks/mercadopago", async (req, res): Promise<void> => {
  res.json({ ok: true }); // Always 200 to avoid MP retries

  const { type, data } = req.body as { type?: string; data?: { id?: string } };
  req.log.info({ type, dataId: data?.id }, "MP webhook received");

  if (type !== "subscription_preapproval" || !data?.id) return;

  const mpToken = process.env["MERCADOPAGO_ACCESS_TOKEN"];
  if (!mpToken) {
    req.log.warn("MERCADOPAGO_ACCESS_TOKEN not configured — skipping webhook processing");
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
    const ourStatus = MP_STATUS_MAP[mpStatus] ?? "expired";
    const userId = preapproval["external_reference"] as string;

    if (!userId) {
      req.log.warn({ preapprovalId: data.id }, "MP preapproval missing external_reference");
      return;
    }

    const supabase = getSupabaseClient();
    const updateData: Record<string, unknown> = {
      subscription_status: ourStatus,
      mp_preapproval_id: data.id,
    };

    const autoRecurring = preapproval["auto_recurring"] as Record<string, unknown> | undefined;
    if (autoRecurring?.["end_date"]) {
      updateData["current_period_end"] = autoRecurring["end_date"];
    }

    await supabase.from("subscriptions").update(updateData).eq("user_id", userId);
    req.log.info({ userId, mpStatus, ourStatus }, "Subscription updated from webhook");
  } catch (err) {
    req.log.error({ err }, "Webhook processing error");
  }
});

export default router;
