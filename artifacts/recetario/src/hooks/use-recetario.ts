/**
 * useRecetario — hybrid hook for saving recipes, planners, and favorites.
 *
 * Premium users (isPremium=true):  all data goes to Supabase via the API.
 * Trial/free users (isPremium=false): data is kept in localStorage only.
 *
 * Supabase tables used:
 *   recipe_history   — auto-saves every generated recipe
 *   favorite_recipes — recipes marked as favorites
 *   weekly_planner   — saved planners (one row per day)
 *   shopping_lists   — items from the last planner
 */
import { useState, useCallback, useEffect, useRef } from "react";
import { useAuth } from "@/context/auth";

// ── Public types ──────────────────────────────────────────────────

export interface RecipeData {
  name: string;
  usedIngredients: string[];
  steps: string[];
  estimatedTime: string;
  difficulty: string;
  antiAnxietyTip: string;
}

export interface MenuDayItem {
  name: string;
  mainIngredients: string[];
  estimatedTime: string;
  difficulty: string;
  calmMessage: string;
}

export interface MenuDay {
  dayLabel: string | null;
  breakfast: MenuDayItem;
  lunch: MenuDayItem;
  snack: MenuDayItem;
  dinner: MenuDayItem;
  optionalSnack: MenuDayItem;
}

export interface PlannerMeal {
  name: string;
  estimatedTime: string;
  difficulty: string;
  tags: string[];
}

export interface PlannerDay {
  day: string;
  breakfast: PlannerMeal;
  lunch: PlannerMeal;
  snack: PlannerMeal;
  dinner: PlannerMeal;
}

export interface ShoppingCategory {
  category: string;
  items: string[];
}

export interface PlannerData {
  days: PlannerDay[];
  shoppingList: ShoppingCategory[];
  weeklySavingsMessage: string;
}

export type SavedEntry =
  | { id: string; type: "recipe"; savedAt: number; isFavorite: boolean; title: string; data: RecipeData }
  | { id: string; type: "menu"; savedAt: number; isFavorite: boolean; title: string; data: { days: MenuDay[] } }
  | { id: string; type: "planner"; savedAt: number; isFavorite: boolean; title: string; data: PlannerData };

// ── Local storage (trial / non-premium) ──────────────────────────

const STORAGE_KEY = "recetario_v1";
const MAX_NON_FAV = 20;

function newId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function loadLocal(): SavedEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SavedEntry[]) : [];
  } catch {
    return [];
  }
}

function persistLocal(entries: SavedEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // storage full
  }
}

function trim(entries: SavedEntry[]): SavedEntry[] {
  const sorted = [...entries].sort((a, b) => b.savedAt - a.savedAt);
  const favs = sorted.filter((e) => e.isFavorite);
  const rest = sorted.filter((e) => !e.isFavorite).slice(0, MAX_NON_FAV);
  return [...favs, ...rest].sort((a, b) => b.savedAt - a.savedAt);
}

// ── Cloud API (Supabase via API server) ───────────────────────────

const BASE = (import.meta.env.BASE_URL ?? "").replace(/\/$/, "");

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T | null> {
  try {
    const r = await fetch(`${BASE}${path}`, init);
    if (!r.ok) return null;
    if (r.status === 204) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  }
}

// ── API response types ────────────────────────────────────────────

interface HistoryRow {
  id: string;
  recipe_name: string;
  ingredients: string[];   // already parsed by the API
  instructions: string[];  // already parsed by the API
  created_at: string;
}

interface PlannerRow {
  id: string;
  day: string;
  breakfast: string;
  lunch: string;
  snack: string;
  dinner: string;
  created_at: string;
}

// Convert an API history row to a SavedEntry, using the favorites set to mark isFavorite
function historyToEntry(row: HistoryRow, favoriteNames: Set<string>): Extract<SavedEntry, { type: "recipe" }> {
  return {
    id: row.id,
    type: "recipe",
    title: row.recipe_name,
    isFavorite: favoriteNames.has(row.recipe_name),
    savedAt: new Date(row.created_at).getTime(),
    data: {
      name: row.recipe_name,
      usedIngredients: row.ingredients,
      steps: row.instructions,
      estimatedTime: "",
      difficulty: "Fácil",
      antiAnxietyTip: "",
    },
  };
}

// Convert a favorites row to a SavedEntry
function favoriteToEntry(row: HistoryRow): Extract<SavedEntry, { type: "recipe" }> {
  return {
    id: row.id,
    type: "recipe",
    title: row.recipe_name,
    isFavorite: true,
    savedAt: new Date(row.created_at).getTime(),
    data: {
      name: row.recipe_name,
      usedIngredients: row.ingredients,
      steps: row.instructions,
      estimatedTime: "",
      difficulty: "Fácil",
      antiAnxietyTip: "",
    },
  };
}

// Build a minimal PlannerMeal from a name string
function mealFrom(name: string): PlannerMeal {
  return { name: name || "Sin definir", estimatedTime: "", difficulty: "Fácil", tags: [] };
}

// Convert planner rows (one per day) to a single SavedEntry
function plannerRowsToEntry(rows: PlannerRow[]): Extract<SavedEntry, { type: "planner" }> | null {
  if (rows.length === 0) return null;
  const days: PlannerDay[] = rows.map((r) => ({
    day: r.day,
    breakfast: mealFrom(r.breakfast),
    lunch: mealFrom(r.lunch),
    snack: mealFrom(r.snack),
    dinner: mealFrom(r.dinner),
  }));
  const oldest = rows[0].created_at;
  return {
    id: `planner-${rows[0].id}`,
    type: "planner",
    title: "Planner semanal",
    isFavorite: false,
    savedAt: new Date(oldest).getTime(),
    data: { days, shoppingList: [], weeklySavingsMessage: "" },
  };
}

// Load all premium data from Supabase and return combined entries + favorites
async function cloudLoadAll(): Promise<{
  entries: SavedEntry[];
  favorites: SavedEntry[];
  favoriteNames: Set<string>;
}> {
  const [histResult, favResult, planResult, shopResult] = await Promise.all([
    apiFetch<{ entries: HistoryRow[] }>("/api/userdata/history"),
    apiFetch<{ entries: HistoryRow[] }>("/api/userdata/favorites"),
    apiFetch<{ days: PlannerRow[] }>("/api/userdata/planners"),
    apiFetch<{ categories: ShoppingCategory[] }>("/api/userdata/shopping"),
  ]);

  const favRows = favResult?.entries ?? [];
  const favoriteNames = new Set(favRows.map((r) => r.recipe_name));

  const histEntries: SavedEntry[] = (histResult?.entries ?? []).map((r) =>
    historyToEntry(r, favoriteNames)
  );

  const favEntries: SavedEntry[] = favRows.map((r) => favoriteToEntry(r));

  // Build planner entry from rows, enriching with shopping list
  const planRows = planResult?.days ?? [];
  const planEntry = plannerRowsToEntry(planRows);
  if (planEntry && shopResult?.categories?.length) {
    planEntry.data.shoppingList = shopResult.categories;
  }

  const allEntries: SavedEntry[] = [
    ...histEntries,
    ...(planEntry ? [planEntry] : []),
  ].sort((a, b) => b.savedAt - a.savedAt);

  return { entries: allEntries, favorites: favEntries, favoriteNames };
}

// ── Hook ──────────────────────────────────────────────────────────

export function useRecetario() {
  const { isPremium } = useAuth();
  const [entries, setEntries] = useState<SavedEntry[]>(loadLocal);
  const [favorites, setFavorites] = useState<SavedEntry[]>([]);
  const [favoriteNames, setFavoriteNames] = useState<Set<string>>(new Set());
  const cloudLoaded = useRef(false);

  // Load cloud data when user is premium
  useEffect(() => {
    if (!isPremium || cloudLoaded.current) return;
    cloudLoaded.current = true;
    cloudLoadAll().then(({ entries: all, favorites: favs, favoriteNames: fns }) => {
      setEntries(all);
      setFavorites(favs);
      setFavoriteNames(fns);
    });
  }, [isPremium]);

  // Reset to local when premium is lost
  useEffect(() => {
    if (!isPremium) {
      cloudLoaded.current = false;
      setEntries(loadLocal());
      setFavorites([]);
      setFavoriteNames(new Set());
    }
  }, [isPremium]);

  // ── addRecipes ───────────────────────────────────────────────────
  const addRecipes = useCallback(
    async (recipes: RecipeData[]): Promise<string[]> => {
      const now = Date.now();

      if (!isPremium) {
        const newEntries: SavedEntry[] = recipes.map((r) => ({
          id: newId("r"),
          type: "recipe" as const,
          savedAt: now,
          isFavorite: false,
          title: r.name,
          data: r,
        }));
        const next = trim([...newEntries, ...loadLocal()]);
        persistLocal(next);
        setEntries(next);
        return newEntries.map((e) => e.id);
      }

      // Premium → save to recipe_history in Supabase
      const result = await apiFetch<{ ids: string[] }>("/api/userdata/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipes }),
      });

      const ids = result?.ids ?? recipes.map(() => newId("r"));

      // Reload history to reflect new entries
      const [histResult] = await Promise.all([
        apiFetch<{ entries: HistoryRow[] }>("/api/userdata/history"),
      ]);
      const histEntries: SavedEntry[] = (histResult?.entries ?? []).map((r) =>
        historyToEntry(r, favoriteNames)
      );
      setEntries((prev) => {
        const planners = prev.filter((e) => e.type === "planner");
        return [...histEntries, ...planners].sort((a, b) => b.savedAt - a.savedAt);
      });

      return ids;
    },
    [isPremium, favoriteNames]
  );

  // ── addMenu (local only — no Supabase table for menus) ───────────
  const addMenu = useCallback(
    async (days: MenuDay[], label: string): Promise<string> => {
      const entry: SavedEntry = {
        id: newId("m"),
        type: "menu",
        savedAt: Date.now(),
        isFavorite: false,
        title: label,
        data: { days },
      };
      if (!isPremium) {
        const next = trim([entry, ...loadLocal()]);
        persistLocal(next);
        setEntries(next);
      } else {
        setEntries((prev) => trim([entry, ...prev]));
      }
      return entry.id;
    },
    [isPremium]
  );

  // ── addPlanner ───────────────────────────────────────────────────
  const addPlanner = useCallback(
    async (data: PlannerData): Promise<string> => {
      if (!isPremium) {
        const entry: SavedEntry = {
          id: newId("p"),
          type: "planner",
          savedAt: Date.now(),
          isFavorite: false,
          title: "Planner semanal",
          data,
        };
        const next = trim([entry, ...loadLocal()]);
        persistLocal(next);
        setEntries(next);
        return entry.id;
      }

      // Premium → save to weekly_planner + shopping_lists
      await apiFetch("/api/userdata/planners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          days: data.days,
          shoppingList: data.shoppingList,
          weeklySavingsMessage: data.weeklySavingsMessage,
        }),
      });

      // Reload planner + shopping from cloud
      const [planResult, shopResult] = await Promise.all([
        apiFetch<{ days: PlannerRow[] }>("/api/userdata/planners"),
        apiFetch<{ categories: ShoppingCategory[] }>("/api/userdata/shopping"),
      ]);

      const planEntry = plannerRowsToEntry(planResult?.days ?? []);
      if (planEntry) {
        planEntry.data.shoppingList = shopResult?.categories ?? data.shoppingList;
        planEntry.data.weeklySavingsMessage = data.weeklySavingsMessage;
        setEntries((prev) => {
          const nonPlanners = prev.filter((e) => e.type !== "planner");
          return [planEntry, ...nonPlanners].sort((a, b) => b.savedAt - a.savedAt);
        });
        return planEntry.id;
      }

      return newId("p");
    },
    [isPremium]
  );

  // ── updateEntry (planner inline editing) ────────────────────────
  const updateEntry = useCallback(
    async (id: string, data: unknown, title?: string): Promise<void> => {
      // Optimistic local update
      setEntries((prev) =>
        prev.map((e) =>
          e.id === id ? { ...e, data: data as never, ...(title ? { title } : {}) } : e
        )
      );

      if (!isPremium) {
        const local = loadLocal().map((e) =>
          e.id === id ? { ...e, data: data as never, ...(title ? { title } : {}) } : e
        );
        persistLocal(local);
        return;
      }

      const plannerData = data as PlannerData;
      await apiFetch("/api/userdata/planners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          days: plannerData.days,
          shoppingList: plannerData.shoppingList,
          weeklySavingsMessage: plannerData.weeklySavingsMessage,
        }),
      });
    },
    [isPremium]
  );

  // ── toggleFavorite ───────────────────────────────────────────────
  const toggleFavorite = useCallback(
    (id: string) => {
      // Find the entry in both entries and favorites
      const entry = [...entries, ...favorites].find((e) => e.id === id);
      if (!entry || entry.type === "menu") return;

      const currentlyFav = entry.type === "recipe"
        ? favoriteNames.has(entry.title)
        : entry.isFavorite;

      // Optimistic update
      if (entry.type === "recipe") {
        const newNames = new Set(favoriteNames);
        if (currentlyFav) {
          newNames.delete(entry.title);
        } else {
          newNames.add(entry.title);
        }
        setFavoriteNames(newNames);
        setEntries((prev) =>
          prev.map((e) =>
            e.id === id ? { ...e, isFavorite: !currentlyFav } : e
          )
        );
        if (currentlyFav) {
          setFavorites((prev) => prev.filter((f) => f.title !== entry.title));
        } else {
          const newFav: Extract<SavedEntry, { type: "recipe" }> = {
            ...entry as Extract<SavedEntry, { type: "recipe" }>,
            isFavorite: true,
          };
          setFavorites((prev) => [newFav, ...prev]);
        }
      } else {
        setEntries((prev) =>
          prev.map((e) =>
            e.id === id ? { ...e, isFavorite: !currentlyFav } : e
          )
        );
      }

      if (!isPremium) {
        const local = loadLocal().map((e) =>
          e.id === id ? { ...e, isFavorite: !currentlyFav } : e
        );
        persistLocal(local);
        return;
      }

      // Cloud operations
      if (entry.type === "recipe") {
        if (currentlyFav) {
          // Remove from favorites: find the favorite row ID
          const favRow = favorites.find((f) => f.title === entry.title);
          if (favRow) {
            apiFetch(`/api/userdata/favorites/${favRow.id}`, { method: "DELETE" });
          }
        } else {
          const recipeEntry = entry as Extract<SavedEntry, { type: "recipe" }>;
          apiFetch("/api/userdata/favorites", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              recipe_name: recipeEntry.data.name,
              ingredients: recipeEntry.data.usedIngredients,
              instructions: recipeEntry.data.steps,
            }),
          });
        }
      }
    },
    [isPremium, entries, favorites, favoriteNames]
  );

  // ── deleteEntry ──────────────────────────────────────────────────
  const deleteEntry = useCallback(
    (id: string) => {
      const entry = [...entries, ...favorites].find((e) => e.id === id);

      setEntries((prev) => prev.filter((e) => e.id !== id));
      setFavorites((prev) => prev.filter((f) => f.id !== id));

      if (!isPremium) {
        const local = loadLocal().filter((e) => e.id !== id);
        persistLocal(local);
        return;
      }

      if (!entry) return;

      if (entry.type === "recipe") {
        // Check if it's a history entry or a favorite
        const isFavEntry = favorites.some((f) => f.id === id);
        if (isFavEntry) {
          apiFetch(`/api/userdata/favorites/${id}`, { method: "DELETE" });
        } else {
          apiFetch(`/api/userdata/history/${id}`, { method: "DELETE" });
        }
      }
    },
    [isPremium, entries, favorites]
  );

  // For non-premium: favorites come from entries
  const effectiveFavorites = isPremium
    ? favorites
    : entries.filter((e) => e.isFavorite);

  return {
    entries,
    favorites: effectiveFavorites,
    addRecipes,
    addMenu,
    addPlanner,
    updateEntry,
    toggleFavorite,
    deleteEntry,
  };
}
