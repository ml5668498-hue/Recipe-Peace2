import { useState, useCallback, useEffect, useRef } from "react";
import { useAuth } from "@/context/auth";

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

// ── Local storage (non-premium) ───────────────────────────────────

const STORAGE_KEY = "recetario_v1";
const MAX_NON_FAVORITES = 20;

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
  const rest = sorted.filter((e) => !e.isFavorite).slice(0, MAX_NON_FAVORITES);
  return [...favs, ...rest].sort((a, b) => b.savedAt - a.savedAt);
}

// ── Cloud API helpers (premium — Supabase via API server) ─────────

const BASE = (import.meta.env.BASE_URL ?? "").replace(/\/$/, "");

async function apiGet<T>(path: string): Promise<T | null> {
  try {
    const r = await fetch(`${BASE}${path}`);
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  }
}

async function apiPost<T>(path: string, body: unknown): Promise<T | null> {
  try {
    const r = await fetch(`${BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  }
}

async function apiPatch(path: string, body?: unknown): Promise<void> {
  try {
    await fetch(`${BASE}${path}`, {
      method: "PATCH",
      headers: body ? { "Content-Type": "application/json" } : {},
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    // silent
  }
}

async function apiPut(path: string, body: unknown): Promise<void> {
  try {
    await fetch(`${BASE}${path}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    // silent
  }
}

async function apiDelete(path: string): Promise<void> {
  try {
    await fetch(`${BASE}${path}`, { method: "DELETE" });
  } catch {
    // silent
  }
}

// Fetch all premium entries: history + planners merged
async function cloudLoadAll(): Promise<SavedEntry[]> {
  const [histResult, planResult] = await Promise.all([
    apiGet<{ entries: SavedEntry[] }>("/api/userdata/history"),
    apiGet<{ entries: SavedEntry[] }>("/api/userdata/planners"),
  ]);
  const history = histResult?.entries ?? [];
  const planners = planResult?.entries ?? [];
  return [...history, ...planners].sort((a, b) => b.savedAt - a.savedAt);
}

// ── Hook ─────────────────────────────────────────────────────────

export function useRecetario() {
  const { isPremium } = useAuth();
  const [entries, setEntries] = useState<SavedEntry[]>(loadLocal);
  const cloudLoaded = useRef(false);

  // Load from Supabase (via API) when premium
  useEffect(() => {
    if (!isPremium || cloudLoaded.current) return;
    cloudLoaded.current = true;
    cloudLoadAll().then((all) => {
      if (all.length > 0) setEntries(all);
    });
  }, [isPremium]);

  // Reset when user loses premium
  useEffect(() => {
    if (!isPremium) {
      cloudLoaded.current = false;
      setEntries(loadLocal());
    }
  }, [isPremium]);

  // ── addRecipes ─────────────────────────────────────────────────
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
        const current = loadLocal();
        const next = trim([...newEntries, ...current]);
        persistLocal(next);
        setEntries(next);
        return newEntries.map((e) => e.id);
      }

      // Premium: save to Supabase recipe_history (bulk)
      const result = await apiPost<{ ids: string[] }>("/api/userdata/history", {
        recipes,
      });

      const ids = result?.ids ?? [];

      // Refresh from cloud
      const all = await cloudLoadAll();
      setEntries(all);

      // Map response IDs — if fewer than recipes, pad with local IDs
      return recipes.map((_, i) => ids[i] ?? newId("r"));
    },
    [isPremium]
  );

  // ── addMenu (always local — no premium table for menus) ────────
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
        const current = loadLocal();
        const next = trim([entry, ...current]);
        persistLocal(next);
        setEntries(next);
      } else {
        // For premium users, keep menus local-only (no Supabase table)
        setEntries((prev) => trim([entry, ...prev]));
      }
      return entry.id;
    },
    [isPremium]
  );

  // ── addPlanner ─────────────────────────────────────────────────
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
        const current = loadLocal();
        const next = trim([entry, ...current]);
        persistLocal(next);
        setEntries(next);
        return entry.id;
      }

      // Premium: save to Supabase weekly_planner
      const result = await apiPost<{ id: string; type: string; title: string; isFavorite: boolean; savedAt: number; data: PlannerData }>(
        "/api/userdata/planners",
        {
          title: "Planner semanal",
          days: data.days,
          shoppingList: data.shoppingList,
          weeklySavingsMessage: data.weeklySavingsMessage,
        }
      );

      const all = await cloudLoadAll();
      setEntries(all);

      return result?.id ?? newId("p");
    },
    [isPremium]
  );

  // ── updateEntry (planner editing) ─────────────────────────────
  const updateEntry = useCallback(
    async (id: string, data: unknown, title?: string): Promise<void> => {
      // Optimistic local update
      setEntries((prev) =>
        prev.map((e) =>
          e.id === id
            ? { ...e, data: data as never, ...(title ? { title } : {}) }
            : e
        )
      );

      if (!isPremium) {
        const local = loadLocal().map((e) =>
          e.id === id ? { ...e, data: data as never, ...(title ? { title } : {}) } : e
        );
        persistLocal(local);
        return;
      }

      // Determine type for routing
      const entry = entries.find((e) => e.id === id);
      if (entry?.type === "planner") {
        const plannerData = data as PlannerData;
        await apiPut(`/api/userdata/planners/${id}`, {
          days: plannerData.days,
          shoppingList: plannerData.shoppingList,
          weeklySavingsMessage: plannerData.weeklySavingsMessage,
          title,
        });
      }
    },
    [isPremium, entries]
  );

  // ── toggleFavorite ─────────────────────────────────────────────
  const toggleFavorite = useCallback(
    (id: string) => {
      const entry = entries.find((e) => e.id === id);
      if (!entry) return;

      // Optimistic update
      setEntries((prev) => {
        const next = trim(prev.map((e) => (e.id === id ? { ...e, isFavorite: !e.isFavorite } : e)));
        if (!isPremium) persistLocal(next);
        return next;
      });

      if (!isPremium) return;

      // Cloud: route based on type
      if (entry.type === "recipe") {
        apiPatch(`/api/userdata/history/${id}/favorite`);
      } else if (entry.type === "planner") {
        apiPatch(`/api/userdata/planners/${id}/favorite`);
      }
    },
    [isPremium, entries]
  );

  // ── deleteEntry ───────────────────────────────────────────────
  const deleteEntry = useCallback(
    (id: string) => {
      const entry = entries.find((e) => e.id === id);

      setEntries((prev) => {
        const next = prev.filter((e) => e.id !== id);
        if (!isPremium) persistLocal(next);
        return next;
      });

      if (!isPremium || !entry) return;

      if (entry.type === "recipe") {
        apiDelete(`/api/userdata/history/${id}`);
      } else if (entry.type === "planner") {
        apiDelete(`/api/userdata/planners/${id}`);
      }
    },
    [isPremium, entries]
  );

  return {
    entries,
    favorites: entries.filter((e) => e.isFavorite),
    addRecipes,
    addMenu,
    addPlanner,
    updateEntry,
    toggleFavorite,
    deleteEntry,
  };
}
