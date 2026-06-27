/**
 * /api/userdata — Supabase-backed persistence for premium features.
 *
 * Tables (already created by user in Supabase SQL Editor):
 *   favorite_recipes  (id, user_email, recipe_name, ingredients, instructions, created_at)
 *   recipe_history    (id, user_email, recipe_name, ingredients, instructions, created_at)
 *   weekly_planner    (id, user_email, day, breakfast, lunch, dinner, created_at)
 *   shopping_lists    (id, user_email, item, quantity, created_at)
 *
 * Data encoding:
 *   ingredients  = comma-separated string   ↔  string[]
 *   instructions = newline-separated string ↔  string[]
 *   weekly_planner.dinner  = "Merienda: {snack} | Cena: {dinner}" to fit 2 meals in 1 col
 *   shopping_lists.quantity = category name (repurposed)
 */
import { Router, type IRouter } from "express";
import { getSupabaseClient } from "../../lib/supabase";

const router: IRouter = Router();

// ── helpers ──────────────────────────────────────────────────────

function toText(arr: string[]): string {
  return arr.join("\n");
}

function fromText(text: string): string[] {
  if (!text) return [];
  return text.split("\n").filter(Boolean);
}

function toIngText(arr: string[]): string {
  return arr.join(", ");
}

function fromIngText(text: string): string[] {
  if (!text) return [];
  return text.split(",").map((s) => s.trim()).filter(Boolean);
}

// ── recipe_history ────────────────────────────────────────────────

/**
 * GET /api/userdata/history
 * Returns all recipes for the logged-in user from recipe_history.
 */
router.get("/userdata/history", async (req, res): Promise<void> => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("recipe_history")
    .select("id, recipe_name, ingredients, instructions, created_at")
    .eq("user_email", req.userEmail!)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    req.log.error({ error }, "recipe_history fetch failed");
    res.status(500).json({ error: "Error al obtener historial." });
    return;
  }

  res.json({
    entries: (data ?? []).map((r) => ({
      id: String(r.id),
      recipe_name: String(r.recipe_name),
      ingredients: fromIngText(String(r.ingredients ?? "")),
      instructions: fromText(String(r.instructions ?? "")),
      created_at: String(r.created_at),
    })),
  });
});

/**
 * POST /api/userdata/history
 * Body: { recipes: Array<{ name, usedIngredients, steps, estimatedTime, difficulty, antiAnxietyTip }> }
 * Inserts each recipe as a row in recipe_history.
 */
router.post("/userdata/history", async (req, res): Promise<void> => {
  type RecipeIn = {
    name?: string;
    usedIngredients?: string[];
    steps?: string[];
    estimatedTime?: string;
    difficulty?: string;
    antiAnxietyTip?: string;
  };

  const recipes: RecipeIn[] = Array.isArray(req.body?.recipes)
    ? (req.body.recipes as RecipeIn[])
    : [req.body as RecipeIn];

  const rows = recipes
    .filter((r) => r?.name)
    .map((r) => ({
      user_email: req.userEmail!,
      recipe_name: r.name!,
      ingredients: toIngText(r.usedIngredients ?? []),
      instructions: toText(r.steps ?? []),
    }));

  if (rows.length === 0) {
    res.status(400).json({ error: "Sin recetas válidas." });
    return;
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("recipe_history")
    .insert(rows)
    .select("id");

  if (error) {
    req.log.error({ error }, "recipe_history insert failed");
    res.status(500).json({ error: "Error al guardar historial." });
    return;
  }

  res.status(201).json({ ids: (data ?? []).map((r) => String(r.id)) });
});

/**
 * DELETE /api/userdata/history/:id
 * Deletes a recipe from recipe_history (and from favorite_recipes if present).
 */
router.delete("/userdata/history/:id", async (req, res): Promise<void> => {
  const supabase = getSupabaseClient();

  // Get recipe_name to also clean up favorites
  const { data: row } = await supabase
    .from("recipe_history")
    .select("recipe_name")
    .eq("id", req.params.id)
    .eq("user_email", req.userEmail!)
    .single();

  await supabase.from("recipe_history").delete().eq("id", req.params.id).eq("user_email", req.userEmail!);

  if (row) {
    // Also remove from favorites if it was there
    await supabase
      .from("favorite_recipes")
      .delete()
      .eq("user_email", req.userEmail!)
      .eq("recipe_name", String(row.recipe_name));
  }

  res.status(204).send();
});

// ── favorite_recipes ──────────────────────────────────────────────

/**
 * GET /api/userdata/favorites
 * Returns all favorite recipes for the user.
 */
router.get("/userdata/favorites", async (req, res): Promise<void> => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("favorite_recipes")
    .select("id, recipe_name, ingredients, instructions, created_at")
    .eq("user_email", req.userEmail!)
    .order("created_at", { ascending: false });

  if (error) {
    req.log.error({ error }, "favorite_recipes fetch failed");
    res.status(500).json({ error: "Error al obtener favoritos." });
    return;
  }

  res.json({
    entries: (data ?? []).map((r) => ({
      id: String(r.id),
      recipe_name: String(r.recipe_name),
      ingredients: fromIngText(String(r.ingredients ?? "")),
      instructions: fromText(String(r.instructions ?? "")),
      created_at: String(r.created_at),
    })),
  });
});

/**
 * POST /api/userdata/favorites
 * Body: { recipe_name, ingredients, instructions }
 * Adds a recipe to favorite_recipes (upsert by recipe_name).
 */
router.post("/userdata/favorites", async (req, res): Promise<void> => {
  const { recipe_name, ingredients, instructions } = req.body as {
    recipe_name?: string;
    ingredients?: string[];
    instructions?: string[];
  };

  if (!recipe_name) {
    res.status(400).json({ error: "recipe_name requerido." });
    return;
  }

  const supabase = getSupabaseClient();

  // Delete any existing row for this recipe+user first (avoid duplicates)
  await supabase
    .from("favorite_recipes")
    .delete()
    .eq("user_email", req.userEmail!)
    .eq("recipe_name", recipe_name);

  const { data, error } = await supabase
    .from("favorite_recipes")
    .insert({
      user_email: req.userEmail!,
      recipe_name,
      ingredients: toIngText(ingredients ?? []),
      instructions: toText(instructions ?? []),
    })
    .select("id")
    .single();

  if (error) {
    req.log.error({ error }, "favorite_recipes insert failed");
    res.status(500).json({ error: "Error al guardar favorito." });
    return;
  }

  res.status(201).json({ id: String((data as { id: string }).id) });
});

/**
 * DELETE /api/userdata/favorites/:id
 * Removes a recipe from favorite_recipes.
 */
router.delete("/userdata/favorites/:id", async (req, res): Promise<void> => {
  const supabase = getSupabaseClient();
  await supabase
    .from("favorite_recipes")
    .delete()
    .eq("id", req.params.id)
    .eq("user_email", req.userEmail!);
  res.status(204).send();
});

// ── weekly_planner ────────────────────────────────────────────────

/**
 * GET /api/userdata/planners
 * Returns the current planner (most recent rows) as a grouped PlannerData.
 */
router.get("/userdata/planners", async (req, res): Promise<void> => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("weekly_planner")
    .select("id, day, breakfast, lunch, dinner, created_at")
    .eq("user_email", req.userEmail!)
    .order("created_at", { ascending: true });

  if (error) {
    req.log.error({ error }, "weekly_planner fetch failed");
    res.status(500).json({ error: "Error al obtener planner." });
    return;
  }

  // Parse combined dinner field: "Merienda: X | Cena: Y" or plain "Y"
  function parseDinner(raw: string): { snack: string; dinner: string } {
    if (raw.includes("Merienda:") && raw.includes("| Cena:")) {
      const [snackPart, dinnerPart] = raw.split("| Cena:");
      return {
        snack: snackPart.replace("Merienda:", "").trim(),
        dinner: dinnerPart?.trim() ?? raw,
      };
    }
    return { snack: "", dinner: raw };
  }

  const days = (data ?? []).map((r) => {
    const { snack, dinner } = parseDinner(String(r.dinner ?? ""));
    return {
      id: String(r.id),
      day: String(r.day),
      breakfast: String(r.breakfast ?? ""),
      lunch: String(r.lunch ?? ""),
      snack,
      dinner,
      created_at: String(r.created_at),
    };
  });

  res.json({ days });
});

/**
 * POST /api/userdata/planners
 * Body: { days: PlannerDay[], shoppingList: ShoppingCategory[], weeklySavingsMessage: string }
 * Replaces all planner rows + shopping list rows for the user.
 */
router.post("/userdata/planners", async (req, res): Promise<void> => {
  type PlannerDayIn = {
    day?: string;
    breakfast?: { name?: string };
    lunch?: { name?: string };
    snack?: { name?: string };
    dinner?: { name?: string };
  };
  type ShopCatIn = { category?: string; items?: string[] };

  const { days, shoppingList, weeklySavingsMessage } = req.body as {
    days?: PlannerDayIn[];
    shoppingList?: ShopCatIn[];
    weeklySavingsMessage?: string;
  };

  if (!Array.isArray(days) || days.length === 0) {
    res.status(400).json({ error: "Planner sin días." });
    return;
  }

  const supabase = getSupabaseClient();

  // Replace planner rows
  await supabase.from("weekly_planner").delete().eq("user_email", req.userEmail!);

  const plannerRows = days.map((d) => ({
    user_email: req.userEmail!,
    day: d.day ?? "",
    breakfast: d.breakfast?.name ?? "",
    lunch: d.lunch?.name ?? "",
    dinner: `Merienda: ${d.snack?.name ?? ""} | Cena: ${d.dinner?.name ?? ""}`,
  }));

  const { error: planErr } = await supabase.from("weekly_planner").insert(plannerRows);
  if (planErr) {
    req.log.error({ error: planErr }, "weekly_planner insert failed");
    res.status(500).json({ error: "Error al guardar planner." });
    return;
  }

  // Replace shopping list rows
  if (Array.isArray(shoppingList) && shoppingList.length > 0) {
    await supabase.from("shopping_lists").delete().eq("user_email", req.userEmail!);

    const shopRows: { user_email: string; item: string; quantity: string }[] = [];
    for (const cat of shoppingList) {
      for (const item of cat.items ?? []) {
        shopRows.push({
          user_email: req.userEmail!,
          item,
          quantity: cat.category ?? "General",
        });
      }
    }
    if (shopRows.length > 0) {
      await supabase.from("shopping_lists").insert(shopRows);
    }
  }

  res.status(201).json({
    ok: true,
    days_saved: days.length,
    message: weeklySavingsMessage ?? "",
  });
});

/**
 * PUT /api/userdata/planners
 * Same as POST — replaces planner with updated data (used by inline editing).
 */
router.put("/userdata/planners", async (req, res): Promise<void> => {
  type PlannerDayIn = {
    day?: string;
    breakfast?: { name?: string };
    lunch?: { name?: string };
    snack?: { name?: string };
    dinner?: { name?: string };
  };
  type ShopCatIn = { category?: string; items?: string[] };

  const { days, shoppingList, weeklySavingsMessage } = req.body as {
    days?: PlannerDayIn[];
    shoppingList?: ShopCatIn[];
    weeklySavingsMessage?: string;
  };

  if (!Array.isArray(days) || days.length === 0) {
    res.status(400).json({ error: "Planner sin días." });
    return;
  }

  const supabase = getSupabaseClient();

  await supabase.from("weekly_planner").delete().eq("user_email", req.userEmail!);

  const plannerRows = days.map((d) => ({
    user_email: req.userEmail!,
    day: d.day ?? "",
    breakfast: d.breakfast?.name ?? "",
    lunch: d.lunch?.name ?? "",
    dinner: `Merienda: ${d.snack?.name ?? ""} | Cena: ${d.dinner?.name ?? ""}`,
  }));

  const { error: planErr } = await supabase.from("weekly_planner").insert(plannerRows);
  if (planErr) {
    req.log.error({ error: planErr }, "weekly_planner update failed");
    res.status(500).json({ error: "Error al actualizar planner." });
    return;
  }

  if (Array.isArray(shoppingList) && shoppingList.length > 0) {
    await supabase.from("shopping_lists").delete().eq("user_email", req.userEmail!);
    const shopRows: { user_email: string; item: string; quantity: string }[] = [];
    for (const cat of shoppingList) {
      for (const item of cat.items ?? []) {
        shopRows.push({ user_email: req.userEmail!, item, quantity: cat.category ?? "General" });
      }
    }
    if (shopRows.length > 0) await supabase.from("shopping_lists").insert(shopRows);
  }

  res.json({ ok: true, days_saved: days.length, message: weeklySavingsMessage ?? "" });
});

// ── shopping_lists ────────────────────────────────────────────────

/**
 * GET /api/userdata/shopping
 * Returns shopping list grouped by category (quantity column).
 */
router.get("/userdata/shopping", async (req, res): Promise<void> => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("shopping_lists")
    .select("item, quantity")
    .eq("user_email", req.userEmail!)
    .order("quantity", { ascending: true }); // group by category alphabetically

  if (error) {
    req.log.error({ error }, "shopping_lists fetch failed");
    res.status(500).json({ error: "Error al obtener lista de compras." });
    return;
  }

  // Group items by category (stored in `quantity` column)
  const grouped = new Map<string, string[]>();
  for (const row of data ?? []) {
    const cat = String(row.quantity ?? "General");
    const existing = grouped.get(cat) ?? [];
    existing.push(String(row.item));
    grouped.set(cat, existing);
  }

  const categories = Array.from(grouped.entries()).map(([category, items]) => ({
    category,
    items,
  }));

  res.json({ categories });
});

export default router;
