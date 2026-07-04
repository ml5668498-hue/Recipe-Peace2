import { Router, type IRouter } from "express";
import { getPool } from "../../lib/db";

const router: IRouter = Router();

function checkAdminKey(req: any, res: any): boolean {
  const adminKey = process.env["ADMIN_KEY"];
  if (adminKey && req.query["key"] !== adminKey) {
    res.status(401).json({ error: "No autorizado." });
    return false;
  }
  return true;
}

router.post("/admin/grant-premium", async (req, res): Promise<void> => {
  if (!checkAdminKey(req, res)) return;

  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  if (!email) {
    res.status(400).json({ error: "Email requerido." });
    return;
  }

  try {
    const pool = getPool();
    const result = await pool.query(
      "UPDATE users SET premium = TRUE WHERE email = $1 RETURNING id, email, premium",
      [email],
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: "No se encontró un usuario con ese email." });
      return;
    }

    res.json({ ok: true, user: result.rows[0] });
  } catch (err) {
    req.log.error({ err }, "grant-premium failed");
    res.status(500).json({ error: "Error interno del servidor." });
  }
});

export default router;
