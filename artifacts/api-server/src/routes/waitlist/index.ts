import { Router, type IRouter } from "express";
import { z } from "zod";
import { getSupabaseClient } from "../../lib/supabase";

const router: IRouter = Router();

const WaitlistBody = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().max(500),
});

router.post("/waitlist", async (req, res): Promise<void> => {
  const parsed = WaitlistBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Nombre y email válidos son requeridos." });
    return;
  }

  const { name, email } = parsed.data;

  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from("waitlist")
      .upsert({ name, email: email.toLowerCase() }, { onConflict: "email" });

    if (error) {
      req.log.error({ error }, "Supabase upsert error");
      res.status(500).json({ error: "Error al guardar el email." });
      return;
    }

    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Waitlist POST failed");
    res.status(500).json({ error: "Error interno del servidor." });
  }
});

router.get("/waitlist", async (req, res): Promise<void> => {
  const adminKey = process.env["ADMIN_KEY"];
  if (adminKey && req.query["key"] !== adminKey) {
    res.status(401).json({ error: "No autorizado." });
    return;
  }

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("waitlist")
      .select("id, name, email, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      req.log.error({ error }, "Supabase select error");
      res.status(500).json({ error: "Error al consultar." });
      return;
    }

    res.json({ entries: data ?? [], total: data?.length ?? 0 });
  } catch (err) {
    req.log.error({ err }, "Waitlist GET failed");
    res.status(500).json({ error: "Error interno del servidor." });
  }
});

export default router;
