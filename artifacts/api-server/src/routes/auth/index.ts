import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { getPool } from "../../lib/db";
import { requireAuth } from "../../middleware/requireAuth";
import { computeStatus, trialDaysLeft } from "../../middleware/requireSubscription";

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
  return jwt.sign({ userId, email }, process.env["JWT_SECRET"]!, { expiresIn: "30d" });
}

function buildSubscription(createdAt: string, premium: boolean) {
  const trialEnd = new Date(createdAt);
  trialEnd.setDate(trialEnd.getDate() + 14);
  return {
    subscription_status: computeStatus(createdAt, premium),
    premium,
    trial_start: createdAt,
    trial_end: trialEnd.toISOString(),
    days_left: trialDaysLeft(createdAt),
  };
}

router.post("/auth/register", async (req, res): Promise<void> => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Nombre, email válido y contraseña (mín. 6 caracteres) son requeridos." });
    return;
  }

  const { name, email, password } = parsed.data;
  const normalizedEmail = email.toLowerCase().trim();
  const pool = getPool();

  const existing = await pool.query(
    "SELECT id FROM users WHERE email = $1",
    [normalizedEmail],
  );
  if (existing.rows.length > 0) {
    res.status(409).json({ error: "Este email ya está registrado. Iniciá sesión." });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  let user: { id: string; name: string; email: string; premium: boolean; created_at: string };
  try {
    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, premium)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, premium, created_at`,
      [name, normalizedEmail, passwordHash, false],
    );
    user = result.rows[0];
  } catch (error) {
    req.log.error({ error }, "Failed to create user");
    res.status(500).json({ error: "Error al crear el usuario." });
    return;
  }

  const token = generateToken(user.id, user.email);
  res.status(201).json({
    token,
    user: { id: user.id, name: user.name, email: user.email },
    subscription: buildSubscription(user.created_at, user.premium),
  });
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Email y contraseña requeridos." });
    return;
  }

  const { email, password } = parsed.data;
  const pool = getPool();

  const result = await pool.query(
    "SELECT id, name, email, password_hash, premium, created_at FROM users WHERE email = $1",
    [email.toLowerCase().trim()],
  );
  const user = result.rows[0];

  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    res.status(401).json({ error: "Email o contraseña incorrectos." });
    return;
  }

  const token = generateToken(user.id, user.email);
  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email },
    subscription: buildSubscription(user.created_at, user.premium),
  });
});

router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const pool = getPool();

  const result = await pool.query(
    "SELECT id, name, email, premium, created_at FROM users WHERE id = $1",
    [req.userId],
  );
  const user = result.rows[0];

  if (!user) {
    res.status(404).json({ error: "Usuario no encontrado." });
    return;
  }

  res.json({
    user: { id: user.id, name: user.name, email: user.email },
    subscription: buildSubscription(user.created_at, user.premium),
  });
});

export default router;
