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

// ── Local storage helpers ─────────────────────────────────────────

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

// ── API helpers (used for premium users) ─────────────────────────

const BASE = (import.meta.env.BASE_URL ?? "").replace(/\/$/, "");

function rowToEntry(row: Record<string, unknown>): SavedEntry {
  return {
    id: row.id as string,
    type: row.type as SavedEntry["type"],
    title: row.title as string,
    data: row.data as never,
    isFavorite: row.isFavorite as boolean,
    savedAt: row.savedAt as number,
  };
}

async function apiFetch(path: string, options?: RequestInit): Promise<Response> {
  return fetch(`${BASE}${path}`, options);
}

async function apiListEntries(): Promise<SavedEntry[]> {
  try {
    const r = await apiFetch("/api/entries");
    if (!r.ok) return [];
    const { entries } = (await r.json()) as { entries: Record<string, unknown>[] };
    return entries.map(rowToEntry);
  } catch {
    return [];
  }
}

async function apiSaveEntry(
  type: string,
  title: string,
  data: unknown
): Promise<string | null> {
  try {
    const r = await apiFetch("/api/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, title, data }),
    });
    if (!r.ok) return null;
    const row = (await r.json()) as { id: string };
    return row.id;
  } catch {
    return null;
  }
}

async function apiToggleFavorite(id: string): Promise<void> {
  try {
    await apiFetch(`/api/entries/${id}/favorite`, { method: "PATCH" });
  } catch {
    // silent
  }
}

async function apiDeleteEntry(id: string): Promise<void> {
  try {
    await apiFetch(`/api/entries/${id}`, { method: "DELETE" });
  } catch {
    // silent
  }
}

async function apiUpdateEntry(id: string, data: unknown, title?: string): Promise<void> {
  try {
    await apiFetch(`/api/entries/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data, title }),
    });
  } catch {
    // silent
  }
}

// ── Hook ─────────────────────────────────────────────────────────

export function useRecetario() {
  const { isPremium } = useAuth();

  // Always initialize from localStorage for instant load
  const [entries, setEntries] = useState<SavedEntry[]>(load);
  const cloudLoaded = useRef(false);

  // For premium: fetch from API on mount and when premium state changes
  useEffect(() => {
    if (!isPremium) return;
    if (cloudLoaded.current) return;
    cloudLoaded.current = true;
    apiListEntries().then((apiEntries) => {
      setEntries(apiEntries);
      // Also persist locally as cache
      persist(apiEntries);
    });
  }, [isPremium]);

  // Reset cloud-loaded flag when user loses premium (e.g. logout)
  useEffect(() => {
    if (!isPremium) {
      cloudLoaded.current = false;
      // Reload from localStorage
      setEntries(load());
    }
  }, [isPremium]);

  const commitLocal = useCallback(
    (next: SavedEntry[]) => {
      setEntries(next);
      persist(next);
    },
    []
  );

  /** Save multiple recipes. Returns their IDs. */
  const addRecipes = useCallback(
    async (recipes: RecipeData[]): Promise<string[]> => {
      if (!isPremium) {
        // Local-only path
        const now = Date.now();
        const newEntries: SavedEntry[] = recipes.map((r) => ({
          id: newId("r"),
          type: "recipe" as const,
          savedAt: now,
          isFavorite: false,
          title: r.name,
          data: r,
        }));
        const current = load();
        const next = trim([...newEntries, ...current]);
        commitLocal(next);
        return newEntries.map((e) => e.id);
      }

      // Premium: optimistic local insert, then sync to API
      const now = Date.now();
      const tempEntries: SavedEntry[] = recipes.map((r) => ({
        id: newId("r"),
        type: "recipe" as const,
        savedAt: now,
        isFavorite: false,
        title: r.name,
        data: r,
      }));

      // Optimistic update for immediate UI
      setEntries((prev) => trim([...tempEntries, ...prev]));

      // Save each to API and collect server IDs
      const serverIds = await Promise.all(
        recipes.map((r) => apiSaveEntry("recipe", r.name, r))
      );

      // Refresh full list from API to get canonical IDs
      const fresh = await apiListEntries();
      setEntries(fresh);
      persist(fresh);

      // Map temp to server IDs by position
      return serverIds.map((id, i) => id ?? tempEntries[i].id);
    },
    [isPremium, commitLocal]
  );

  /** Save a menu. Returns its ID. */
  const addMenu = useCallback(
    async (days: MenuDay[], label: string): Promise<string> => {
      if (!isPremium) {
        const entry: SavedEntry = {
          id: newId("m"),
          type: "menu",
          savedAt: Date.now(),
          isFavorite: false,
          title: label,
          data: { days },
        };
        const current = load();
        commitLocal(trim([entry, ...current]));
        return entry.id;
      }

      // Premium: optimistic + API
      const tempId = newId("m");
      const tempEntry: SavedEntry = {
        id: tempId,
        type: "menu",
        savedAt: Date.now(),
        isFavorite: false,
        title: label,
        data: { days },
      };
      setEntries((prev) => trim([tempEntry, ...prev]));

      const serverId = await apiSaveEntry("menu", label, { days });
      const fresh = await apiListEntries();
      setEntries(fresh);
      persist(fresh);

      return serverId ?? tempId;
    },
    [isPremium, commitLocal]
  );

  /** Save a planner. Returns its ID. */
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
        const current = load();
        commitLocal(trim([entry, ...current]));
        return entry.id;
      }

      const tempId = newId("p");
      const tempEntry: SavedEntry = {
        id: tempId,
        type: "planner",
        savedAt: Date.now(),
        isFavorite: false,
        title: "Planner semanal",
        data,
      };
      setEntries((prev) => trim([tempEntry, ...prev]));

      const serverId = await apiSaveEntry("planner", "Planner semanal", data);
      const fresh = await apiListEntries();
      setEntries(fresh);
      persist(fresh);

      return serverId ?? tempId;
    },
    [isPremium, commitLocal]
  );

  /** Update an existing entry's data (e.g. after editing planner meals). */
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
        persist(
          (load()).map((e) =>
            e.id === id ? { ...e, data: data as never, ...(title ? { title } : {}) } : e
          )
        );
        return;
      }
      await apiUpdateEntry(id, data, title);
    },
    [isPremium]
  );

  const toggleFavorite = useCallback(
    (id: string) => {
      setEntries((prev) => {
        const next = trim(prev.map((e) => (e.id === id ? { ...e, isFavorite: !e.isFavorite } : e)));
        if (!isPremium) persist(next);
        return next;
      });
      if (isPremium) {
        apiToggleFavorite(id);
      }
    },
    [isPremium]
  );

  const deleteEntry = useCallback(
    (id: string) => {
      setEntries((prev) => {
        const next = prev.filter((e) => e.id !== id);
        if (!isPremium) persist(next);
        return next;
      });
      if (isPremium) {
        apiDeleteEntry(id);
      }
    },
    [isPremium]
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
