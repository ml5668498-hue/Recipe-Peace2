import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { getSupabaseClient } from "../../lib/supabase";
import { requireAuth } from "../../middleware/requireAuth";

const router = Router();

const RegisterBody = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().max(500),
  password: z.string().min(6).max(100),
});

const LoginBody = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function generateToken(userId: string, email: string): string {
  const secret = process.env["JWT_SECRET"]!;
  return jwt.sign({ userId, email }, secret, { expiresIn: "30d" });
}

function getTrialEnd(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return d;
}

router.post("/auth/register", async (req, res): Promise<void> => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Nombre, email válido y contraseña (mín. 6 caracteres) son requeridos." });
    return;
  }

  const { name, email, password } = parsed.data;
  const normalizedEmail = email.toLowerCase().trim();
  const supabase = getSupabaseClient();

  const { data: existing } = await supabase
    .from("users")
    .select("id")
    .eq("email", normalizedEmail)
    .single();

  if (existing) {
    res.status(409).json({ error: "Este email ya está registrado. Iniciá sesión." });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const trialStart = new Date();
  const trialEnd = getTrialEnd();

  const { data: user, error: userError } = await supabase
    .from("users")
    .insert({ name, email: normalizedEmail, password_hash: passwordHash })
    .select("id, name, email, created_at")
    .single();

  if (userError || !user) {
    req.log.error({ error: userError }, "Failed to create user");
    res.status(500).json({ error: "Error al crear el usuario." });
    return;
  }

  const { data: sub, error: subError } = await supabase
    .from("subscriptions")
    .insert({
      user_id: user.id,
      subscription_status: "trial",
      trial_start: trialStart.toISOString(),
      trial_end: trialEnd.toISOString(),
    })
    .select("subscription_status, trial_start, trial_end, mp_preapproval_id, current_period_end")
    .single();

  if (subError || !sub) {
    req.log.error({ error: subError }, "Failed to create subscription");
    await supabase.from("users").delete().eq("id", user.id);
    res.status(500).json({ error: "Error al iniciar la prueba gratuita." });
    return;
  }

  const token = generateToken(user.id, user.email);
  res.status(201).json({
    token,
    user: { id: user.id, name: user.name, email: user.email },
    subscription: sub,
  });
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Email y contraseña requeridos." });
    return;
  }

  const { email, password } = parsed.data;
  const normalizedEmail = email.toLowerCase().trim();
  const supabase = getSupabaseClient();

  const { data: user } = await supabase
    .from("users")
    .select("id, name, email, password_hash")
    .eq("email", normalizedEmail)
    .single();

  if (!user) {
    res.status(401).json({ error: "Email o contraseña incorrectos." });
    return;
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    res.status(401).json({ error: "Email o contraseña incorrectos." });
    return;
  }

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("subscription_status, trial_start, trial_end, mp_preapproval_id, current_period_end")
    .eq("user_id", user.id)
    .single();

  // Expire trial if past trial_end
  if (sub?.subscription_status === "trial" && new Date() > new Date(sub.trial_end)) {
    await supabase
      .from("subscriptions")
      .update({ subscription_status: "expired" })
      .eq("user_id", user.id);
    if (sub) sub.subscription_status = "expired";
  }

  const token = generateToken(user.id, user.email);
  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email },
    subscription: sub,
  });
});

router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const supabase = getSupabaseClient();

  const { data: user } = await supabase
    .from("users")
    .select("id, name, email, created_at")
    .eq("id", req.userId!)
    .single();

  if (!user) {
    res.status(404).json({ error: "Usuario no encontrado." });
    return;
  }

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("subscription_status, trial_start, trial_end, mp_preapproval_id, current_period_end")
    .eq("user_id", user.id)
    .single();

  if (sub?.subscription_status === "trial" && new Date() > new Date(sub.trial_end)) {
    await supabase
      .from("subscriptions")
      .update({ subscription_status: "expired" })
      .eq("user_id", user.id);
    if (sub) sub.subscription_status = "expired";
  }

  res.json({ user, subscription: sub });
});

export default router;
