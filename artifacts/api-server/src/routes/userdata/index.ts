/**
 * /api/userdata — Supabase-backed persistence for premium features.
 *
 * Tables (run SQL in Supabase SQL Editor to create them):
 *   recipe_history, favorite_recipes, weekly_planner, shopping_lists
 *
 * Uses service-role key → bypasses RLS for server-side operations.
 */
import { Router, type IRouter } from "express";
import { getSupabaseClient } from "../../lib/supabase";
import { z } from "zod/v4";

const router: IRouter = Router();

// ── Zod schemas ───────────────────────────────────────────────────

const RecipeBody = z.object({
  name: z.string().min(1),
  usedIngredients: z.array(z.string()),
  steps: z.array(z.string()),
  estimatedTime: z.string(),
  difficulty: z.string(),
  antiAnxietyTip: z.string(),
  objetivo: z.string().optional(),
});

const PlannerBody = z.object({
  title: z.string().default("Planner semanal"),
  days: z.array(z.unknown()),
  shoppingList: z.array(z.unknown()),
  weeklySavingsMessage: z.string(),
});

// ── Helpers ───────────────────────────────────────────────────────

function historyRowToEntry(row: Record<string, unknown>) {
  return {
    id: row["id"] as string,
    type: "recipe" as const,
    title: row["name"] as string,
    isFavorite: row["is_favorite"] as boolean,
    savedAt: new Date(row["created_at"] as string).getTime(),
    data: {
      name: row["name"] as string,
      usedIngredients: (row["used_ingredients"] as string[]) ?? [],
      steps: (row["steps"] as string[]) ?? [],
      estimatedTime: (row["estimated_time"] as string) ?? "",
      difficulty: (row["difficulty"] as string) ?? "Fácil",
      antiAnxietyTip: (row["anti_anxiety_tip"] as string) ?? "",
    },
  };
}

function plannerRowToEntry(row: Record<string, unknown>) {
  return {
    id: row["id"] as string,
    type: "planner" as const,
    title: (row["title"] as string) ?? "Planner semanal",
    isFavorite: row["is_favorite"] as boolean,
    savedAt: new Date((row["updated_at"] ?? row["created_at"]) as string).getTime(),
    data: {
      days: (row["days"] as unknown[]) ?? [],
      shoppingList: (row["shopping_list"] as unknown[]) ?? [],
      weeklySavingsMessage: (row["weekly_savings_message"] as string) ?? "",
    },
  };
}

// ── Recipe History ────────────────────────────────────────────────

// GET /api/userdata/history
router.get("/userdata/history", async (req, res): Promise<void> => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("recipe_history")
    .select("*")
    .eq("user_id", req.userId!)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    req.log.error({ error }, "Failed to fetch recipe_history");
    res.status(500).json({ error: "Error al obtener historial." });
    return;
  }
  res.json({ entries: (data ?? []).map(r => historyRowToEntry(r as Record<string, unknown>)) });
});

// POST /api/userdata/history — save one or many recipes
router.post("/userdata/history", async (req, res): Promise<void> => {
  // Accept either a single recipe object or { recipes: [] }
  const raw = Array.isArray(req.body?.recipes) ? req.body.recipes : [req.body];
  const results: string[] = [];
  const supabase = getSupabaseClient();

  for (const item of raw) {
    const parsed = RecipeBody.safeParse(item);
    if (!parsed.success) continue;
    const { name, usedIngredients, steps, estimatedTime, difficulty, antiAnxietyTip, objetivo } = parsed.data;

    const { data, error } = await supabase
      .from("recipe_history")
      .insert({
        user_id: req.userId!,
        name,
        used_ingredients: usedIngredients,
        steps,
        estimated_time: estimatedTime,
        difficulty,
        anti_anxiety_tip: antiAnxietyTip,
        objetivo: objetivo ?? null,
        is_favorite: false,
      })
      .select("id")
      .single();

    if (error) {
      req.log.warn({ error }, "Failed to insert recipe_history row");
    } else if (data) {
      results.push((data as { id: string }).id);
    }
  }

  res.status(201).json({ ids: results });
});

// PATCH /api/userdata/history/:id/favorite — toggle favorite
router.patch("/userdata/history/:id/favorite", async (req, res): Promise<void> => {
  const supabase = getSupabaseClient();

  const { data: current, error: fetchErr } = await supabase
    .from("recipe_history")
    .select("is_favorite")
    .eq("id", req.params.id)
    .eq("user_id", req.userId!)
    .single();

  if (fetchErr || !current) {
    res.status(404).json({ error: "No encontrado." });
    return;
  }

  const newFav = !(current as { is_favorite: boolean }).is_favorite;

  const { data, error } = await supabase
    .from("recipe_history")
    .update({ is_favorite: newFav })
    .eq("id", req.params.id)
    .eq("user_id", req.userId!)
    .select()
    .single();

  if (error) {
    res.status(500).json({ error: "Error al actualizar favorito." });
    return;
  }

  // Sync favorite_recipes table
  if (newFav) {
    const row = data as Record<string, unknown>;
    await supabase.from("favorite_recipes").upsert({
      id: req.params.id,
      user_id: req.userId!,
      history_id: req.params.id,
      name: row["name"],
      used_ingredients: row["used_ingredients"],
      steps: row["steps"],
      estimated_time: row["estimated_time"],
      difficulty: row["difficulty"],
      anti_anxiety_tip: row["anti_anxiety_tip"],
    }, { onConflict: "id" });
  } else {
    await supabase.from("favorite_recipes").delete().eq("id", req.params.id);
  }

  res.json(historyRowToEntry(data as Record<string, unknown>));
});

// DELETE /api/userdata/history/:id
router.delete("/userdata/history/:id", async (req, res): Promise<void> => {
  const supabase = getSupabaseClient();
  await supabase.from("recipe_history").delete().eq("id", req.params.id).eq("user_id", req.userId!);
  await supabase.from("favorite_recipes").delete().eq("id", req.params.id);
  res.status(204).send();
});

// ── Favorites (read-only from favorite_recipes table) ─────────────

// GET /api/userdata/favorites
router.get("/userdata/favorites", async (req, res): Promise<void> => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("favorite_recipes")
    .select("*")
    .eq("user_id", req.userId!)
    .order("created_at", { ascending: false });

  if (error) {
    req.log.error({ error }, "Failed to fetch favorite_recipes");
    res.status(500).json({ error: "Error al obtener favoritos." });
    return;
  }

  const mapped = (data ?? []).map((r: Record<string, unknown>) => ({
    id: r["id"] as string,
    type: "recipe" as const,
    title: r["name"] as string,
    isFavorite: true,
    savedAt: new Date(r["created_at"] as string).getTime(),
    data: {
      name: r["name"] as string,
      usedIngredients: (r["used_ingredients"] as string[]) ?? [],
      steps: (r["steps"] as string[]) ?? [],
      estimatedTime: (r["estimated_time"] as string) ?? "",
      difficulty: (r["difficulty"] as string) ?? "Fácil",
      antiAnxietyTip: (r["anti_anxiety_tip"] as string) ?? "",
    },
  }));
  res.json({ entries: mapped });
});

// ── Weekly Planner ────────────────────────────────────────────────

// GET /api/userdata/planners
router.get("/userdata/planners", async (req, res): Promise<void> => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("weekly_planner")
    .select("*")
    .eq("user_id", req.userId!)
    .order("updated_at", { ascending: false })
    .limit(20);

  if (error) {
    req.log.error({ error }, "Failed to fetch weekly_planner");
    res.status(500).json({ error: "Error al obtener planners." });
    return;
  }
  res.json({ entries: (data ?? []).map(r => plannerRowToEntry(r as Record<string, unknown>)) });
});

// POST /api/userdata/planners — save a new planner
router.post("/userdata/planners", async (req, res): Promise<void> => {
  const parsed = PlannerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Datos inválidos." });
    return;
  }
  const { title, days, shoppingList, weeklySavingsMessage } = parsed.data;
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("weekly_planner")
    .insert({
      user_id: req.userId!,
      title,
      days: JSON.stringify(days),
      weekly_savings_message: weeklySavingsMessage,
      is_favorite: false,
    })
    .select()
    .single();

  if (error) {
    req.log.error({ error }, "Failed to save planner");
    res.status(500).json({ error: "Error al guardar planner." });
    return;
  }

  const planner = data as Record<string, unknown>;
  const plannerId = planner["id"] as string;

  // Auto-save shopping list
  await supabase.from("shopping_lists").insert({
    user_id: req.userId!,
    planner_id: plannerId,
    categories: JSON.stringify(shoppingList),
  });

  res.status(201).json(plannerRowToEntry({ ...planner, shopping_list: shoppingList }));
});

// PUT /api/userdata/planners/:id — update planner (after editing meals)
router.put("/userdata/planners/:id", async (req, res): Promise<void> => {
  const { days, title, weeklySavingsMessage, shoppingList } = req.body as {
    days?: unknown[];
    title?: string;
    weeklySavingsMessage?: string;
    shoppingList?: unknown[];
  };
  const supabase = getSupabaseClient();

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (days !== undefined) updates["days"] = JSON.stringify(days);
  if (title !== undefined) updates["title"] = title;
  if (weeklySavingsMessage !== undefined) updates["weekly_savings_message"] = weeklySavingsMessage;

  const { data, error } = await supabase
    .from("weekly_planner")
    .update(updates)
    .eq("id", req.params.id)
    .eq("user_id", req.userId!)
    .select()
    .single();

  if (error) {
    res.status(500).json({ error: "Error al actualizar planner." });
    return;
  }

  // Update shopping list if provided
  if (shoppingList !== undefined) {
    await supabase
      .from("shopping_lists")
      .upsert(
        { user_id: req.userId!, planner_id: req.params.id, categories: JSON.stringify(shoppingList) },
        { onConflict: "planner_id" }
      );
  }

  const planner = data as Record<string, unknown>;
  res.json(plannerRowToEntry({ ...planner, shopping_list: shoppingList ?? [] }));
});

// PATCH /api/userdata/planners/:id/favorite — toggle
router.patch("/userdata/planners/:id/favorite", async (req, res): Promise<void> => {
  const supabase = getSupabaseClient();
  const { data: current, error: fetchErr } = await supabase
    .from("weekly_planner")
    .select("is_favorite")
    .eq("id", req.params.id)
    .eq("user_id", req.userId!)
    .single();

  if (fetchErr || !current) { res.status(404).json({ error: "No encontrado." }); return; }

  const newFav = !(current as { is_favorite: boolean }).is_favorite;
  const { data, error } = await supabase
    .from("weekly_planner")
    .update({ is_favorite: newFav, updated_at: new Date().toISOString() })
    .eq("id", req.params.id)
    .eq("user_id", req.userId!)
    .select()
    .single();

  if (error) { res.status(500).json({ error: "Error al actualizar." }); return; }
  res.json(plannerRowToEntry(data as Record<string, unknown>));
});

// DELETE /api/userdata/planners/:id
router.delete("/userdata/planners/:id", async (req, res): Promise<void> => {
  const supabase = getSupabaseClient();
  await supabase.from("shopping_lists").delete().eq("planner_id", req.params.id);
  await supabase.from("weekly_planner").delete().eq("id", req.params.id).eq("user_id", req.userId!);
  res.status(204).send();
});

// ── Shopping list — derived from latest planner ───────────────────

// GET /api/userdata/shopping/:plannerId
router.get("/userdata/shopping/:plannerId", async (req, res): Promise<void> => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("shopping_lists")
    .select("*")
    .eq("planner_id", req.params.plannerId)
    .eq("user_id", req.userId!)
    .single();

  if (error || !data) { res.json({ categories: [] }); return; }
  res.json({ categories: (data as Record<string, unknown>)["categories"] ?? [] });
});

export default router;
