import { Router, type IRouter } from "express";
import { getPool } from "../../lib/db";
import { z } from "zod/v4";

const router: IRouter = Router();

const EntryInput = z.object({
  type: z.enum(["recipe", "menu", "planner"]),
  title: z.string().min(1),
  data: z.unknown(),
});

const UpdateInput = z.object({
  title: z.string().optional(),
  data: z.unknown().optional(),
});

function rowToEntry(row: Record<string, unknown>) {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    data: row.data,
    isFavorite: row.is_favorite,
    savedAt: new Date(row.created_at as string).getTime(),
  };
}

// GET /api/entries — list user entries
router.get("/entries", async (req, res): Promise<void> => {
  try {
    const pool = getPool();
    const result = await pool.query(
      "SELECT * FROM saved_entries WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 100",
      [req.userId]
    );
    res.json({ entries: result.rows.map(rowToEntry) });
  } catch (err) {
    req.log.error({ err }, "Failed to list entries");
    res.status(500).json({ error: "Error al obtener entradas." });
  }
});

// POST /api/entries — save a new entry
router.post("/entries", async (req, res): Promise<void> => {
  const parsed = EntryInput.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Datos inválidos." });
    return;
  }
  const { type, title, data } = parsed.data;
  try {
    const pool = getPool();
    const result = await pool.query(
      "INSERT INTO saved_entries (user_id, type, title, data) VALUES ($1, $2, $3, $4) RETURNING *",
      [req.userId, type, title, JSON.stringify(data)]
    );
    res.status(201).json(rowToEntry(result.rows[0]));
  } catch (err) {
    req.log.error({ err }, "Failed to save entry");
    res.status(500).json({ error: "Error al guardar." });
  }
});

// PUT /api/entries/:id — update entry data (planner editing)
router.put("/entries/:id", async (req, res): Promise<void> => {
  const parsed = UpdateInput.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Datos inválidos." });
    return;
  }
  const { title, data } = parsed.data;
  try {
    const pool = getPool();
    const result = await pool.query(
      `UPDATE saved_entries
       SET title = COALESCE($1, title),
           data  = CASE WHEN $2::text IS NOT NULL THEN $2::jsonb ELSE data END,
           updated_at = NOW()
       WHERE id = $3 AND user_id = $4
       RETURNING *`,
      [title ?? null, data !== undefined ? JSON.stringify(data) : null, req.params.id, req.userId]
    );
    if (!result.rows[0]) {
      res.status(404).json({ error: "Entrada no encontrada." });
      return;
    }
    res.json(rowToEntry(result.rows[0]));
  } catch (err) {
    req.log.error({ err }, "Failed to update entry");
    res.status(500).json({ error: "Error al actualizar." });
  }
});

// PATCH /api/entries/:id/favorite — toggle favorite
router.patch("/entries/:id/favorite", async (req, res): Promise<void> => {
  try {
    const pool = getPool();
    const check = await pool.query(
      "SELECT is_favorite FROM saved_entries WHERE id = $1 AND user_id = $2",
      [req.params.id, req.userId]
    );
    if (!check.rows[0]) {
      res.status(404).json({ error: "Entrada no encontrada." });
      return;
    }
    const newFav = !check.rows[0].is_favorite;
    const result = await pool.query(
      "UPDATE saved_entries SET is_favorite = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3 RETURNING *",
      [newFav, req.params.id, req.userId]
    );
    res.json(rowToEntry(result.rows[0]));
  } catch (err) {
    req.log.error({ err }, "Failed to toggle favorite");
    res.status(500).json({ error: "Error al actualizar favorito." });
  }
});

// DELETE /api/entries/:id — delete entry
router.delete("/entries/:id", async (req, res): Promise<void> => {
  try {
    const pool = getPool();
    await pool.query(
      "DELETE FROM saved_entries WHERE id = $1 AND user_id = $2",
      [req.params.id, req.userId]
    );
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete entry");
    res.status(500).json({ error: "Error al eliminar." });
  }
});

export default router;
