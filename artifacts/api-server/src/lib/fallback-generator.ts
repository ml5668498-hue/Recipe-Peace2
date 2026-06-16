import {
  findRecipesByIngredients,
  getRecipesByCategory,
  pickRandom,
  recipesDB,
  type InternalRecipe,
} from "./recipes-db";

// ── Recipe generation ────────────────────────────────────────────
export function fallbackGenerateRecipes(ingredients: string[]) {
  const matches = findRecipesByIngredients(ingredients, 3);
  return {
    recipes: matches.map((r) => ({
      name: r.name,
      usedIngredients: r.ingredients.filter((ing) =>
        ingredients.some(
          (ui) =>
            ing.toLowerCase().includes(ui.toLowerCase()) ||
            ui.toLowerCase().includes(ing.toLowerCase())
        )
      ).concat(r.mainIngredients).filter((v, i, a) => a.indexOf(v) === i).slice(0, 5),
      steps: r.steps,
      estimatedTime: r.estimatedTime,
      difficulty: r.difficulty,
      antiAnxietyTip: r.antiAnxietyTip,
    })),
  };
}

// ── Meal builder ─────────────────────────────────────────────────
function buildMeal(
  category: "desayuno" | "almuerzo" | "cena" | "merienda" | "snack",
  tag?: string,
  exclude: string[] = []
): ReturnType<typeof mealFromRecipe> {
  let pool = getRecipesByCategory(category, tag).filter(
    (r) => !exclude.includes(r.id)
  );
  if (pool.length === 0) pool = getRecipesByCategory(category);
  const recipe = pickRandom(pool);
  return mealFromRecipe(recipe);
}

function mealFromRecipe(r: InternalRecipe) {
  return {
    name: r.name,
    mainIngredients: r.mainIngredients,
    ingredients: r.ingredients,
    steps: r.steps,
    estimatedTime: r.estimatedTime,
    difficulty: r.difficulty,
    antiAnxietyTip: r.antiAnxietyTip,
    calmMessage: r.calmMessage,
  };
}

function plannerMealFromRecipe(r: InternalRecipe) {
  return {
    name: r.name,
    ingredients: r.ingredients,
    steps: r.steps,
    estimatedTime: r.estimatedTime,
    difficulty: r.difficulty,
    antiAnxietyTip: r.antiAnxietyTip,
    tags: r.tags,
  };
}

// ── Menu generation ───────────────────────────────────────────────
export function fallbackGenerateMenu(
  type: "day" | "week",
  quickOption?: string | null
) {
  const tag =
    quickOption === "10min" || quickOption === "20min"
      ? "rápida"
      : quickOption === "economico"
      ? "económica"
      : quickOption === "familiar"
      ? "familiar"
      : undefined;

  const dayNames = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
  const count = type === "week" ? 7 : 1;

  const days = Array.from({ length: count }, (_, i) => {
    const used: string[] = [];
    const breakfast = buildMeal("desayuno", tag, used);
    const lunch = buildMeal("almuerzo", tag, used);
    const snack = buildMeal("merienda", tag, used);
    const dinner = buildMeal("cena", tag, used);
    const optionalSnack = buildMeal("snack", tag, used);
    return {
      dayLabel: type === "week" ? dayNames[i] : null,
      breakfast,
      lunch,
      snack,
      dinner,
      optionalSnack,
    };
  });

  return { days };
}

// ── Planner generation ────────────────────────────────────────────
const INGREDIENT_CATEGORIES: Record<string, string[]> = {
  Verduras: ["zanahoria", "papa", "cebolla", "tomate", "lechuga", "pimiento", "ajo", "zapallo", "choclo", "palta"],
  Proteínas: ["pollo", "carne", "huevo", "atún", "lentejas", "garbanzos", "jamón", "ricota"],
  Cereales: ["arroz", "pasta", "fideos", "pan", "harina", "avena", "granola", "pan de molde"],
  Lácteos: ["leche", "yogur", "queso", "manteca", "crema"],
  "Básicos de despensa": ["aceite", "sal", "azúcar", "miel", "canela", "curry", "caldo", "orégano", "mayonesa", "limón", "vinagre", "aceite de oliva", "salsa de soja"],
};

function categorizeIngredients(ingredients: string[]): { category: string; items: string[] }[] {
  const buckets: Record<string, string[]> = {
    Verduras: [],
    Proteínas: [],
    Cereales: [],
    Lácteos: [],
    "Básicos de despensa": [],
  };
  const uncategorized: string[] = [];

  for (const ing of ingredients) {
    let placed = false;
    for (const [cat, keywords] of Object.entries(INGREDIENT_CATEGORIES)) {
      if (keywords.some((k) => ing.toLowerCase().includes(k) || k.includes(ing.toLowerCase()))) {
        if (!buckets[cat].includes(ing)) buckets[cat].push(ing);
        placed = true;
        break;
      }
    }
    if (!placed && !uncategorized.includes(ing)) uncategorized.push(ing);
  }

  if (uncategorized.length > 0) {
    buckets["Básicos de despensa"].push(...uncategorized);
  }

  return Object.entries(buckets)
    .filter(([, items]) => items.length > 0)
    .map(([category, items]) => ({ category, items }));
}

export function fallbackGeneratePlanner() {
  const dayNames = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
  const allIngredients: string[] = [];

  const days = dayNames.map((day) => {
    const pickPlannerMeal = (
      category: "desayuno" | "almuerzo" | "cena" | "merienda"
    ) => {
      const pool = getRecipesByCategory(category);
      const recipe = pickRandom(pool);
      allIngredients.push(...recipe.ingredients);
      return plannerMealFromRecipe(recipe);
    };
    return {
      day,
      breakfast: pickPlannerMeal("desayuno"),
      lunch: pickPlannerMeal("almuerzo"),
      snack: pickPlannerMeal("merienda"),
      dinner: pickPlannerMeal("cena"),
    };
  });

  const uniqueIngredients = [...new Set(allIngredients)];
  const shoppingList = categorizeIngredients(uniqueIngredients);

  return {
    days,
    shoppingList,
    weeklySavingsMessage:
      "Esta semana podrías ahorrar aproximadamente $4200 cocinando en casa en lugar de pedir delivery.",
  };
}
