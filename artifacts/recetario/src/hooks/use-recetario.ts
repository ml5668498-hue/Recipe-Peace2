import { useState, useCallback } from "react";

// ── Types ─────────────────────────────────────────────────────────

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

// ── Storage helpers ───────────────────────────────────────────────

const STORAGE_KEY = "recetario_v1";
const MAX_NON_FAVORITES = 20;

function newId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function load(): SavedEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SavedEntry[]) : [];
  } catch {
    return [];
  }
}

function persist(entries: SavedEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // storage full — ignore
  }
}

function trim(entries: SavedEntry[]): SavedEntry[] {
  const sorted = [...entries].sort((a, b) => b.savedAt - a.savedAt);
  const favorites = sorted.filter((e) => e.isFavorite);
  const rest = sorted.filter((e) => !e.isFavorite).slice(0, MAX_NON_FAVORITES);
  return [...favorites, ...rest].sort((a, b) => b.savedAt - a.savedAt);
}

// ── Hook ─────────────────────────────────────────────────────────

export function useRecetario() {
  const [entries, setEntries] = useState<SavedEntry[]>(load);

  const commit = useCallback((next: SavedEntry[]) => {
    setEntries(next);
    persist(next);
  }, []);

  /** Save multiple recipes at once (avoids stale-closure problem).
   *  Returns the list of generated IDs so the caller can track them. */
  const addRecipes = useCallback(
    (recipes: RecipeData[]): string[] => {
      const now = Date.now();
      const newEntries: SavedEntry[] = recipes.map((r) => ({
        id: newId("r"),
        type: "recipe",
        savedAt: now,
        isFavorite: false,
        title: r.name,
        data: r,
      }));
      const next = trim([...newEntries, ...entries]);
      commit(next);
      return newEntries.map((e) => e.id);
    },
    [entries, commit]
  );

  /** Save a generated menu. Returns its ID. */
  const addMenu = useCallback(
    (days: MenuDay[], label: string): string => {
      const entry: SavedEntry = {
        id: newId("m"),
        type: "menu",
        savedAt: Date.now(),
        isFavorite: false,
        title: label,
        data: { days },
      };
      commit(trim([entry, ...entries]));
      return entry.id;
    },
    [entries, commit]
  );

  /** Save a generated planner. Returns its ID. */
  const addPlanner = useCallback(
    (data: PlannerData): string => {
      const entry: SavedEntry = {
        id: newId("p"),
        type: "planner",
        savedAt: Date.now(),
        isFavorite: false,
        title: "Planner semanal",
        data,
      };
      commit(trim([entry, ...entries]));
      return entry.id;
    },
    [entries, commit]
  );

  const toggleFavorite = useCallback(
    (id: string) => {
      commit(trim(entries.map((e) => (e.id === id ? { ...e, isFavorite: !e.isFavorite } : e))));
    },
    [entries, commit]
  );

  const deleteEntry = useCallback(
    (id: string) => {
      commit(entries.filter((e) => e.id !== id));
    },
    [entries, commit]
  );

  return {
    entries,
    favorites: entries.filter((e) => e.isFavorite),
    addRecipes,
    addMenu,
    addPlanner,
    toggleFavorite,
    deleteEntry,
  };
}
