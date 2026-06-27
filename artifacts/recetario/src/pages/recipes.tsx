import { useState, useRef } from "react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Leaf, Clock, X, ChefHat, Star, Lock, Target, AlertCircle, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/auth";
import { Link } from "wouter";

// ── Types ─────────────────────────────────────────────────────────

type Objetivo = "rapido" | "economico" | "familiar" | "saludable" | "sin_harinas" | "sin_azucar" | "para_ansiedad" | "cena_liviana";

const OBJETIVOS: { value: Objetivo; label: string }[] = [
  { value: "rapido", label: "Rápida" },
  { value: "economico", label: "Económica" },
  { value: "familiar", label: "Familiar" },
  { value: "saludable", label: "Saludable" },
  { value: "sin_harinas", label: "Sin harinas" },
  { value: "sin_azucar", label: "Sin azúcar" },
  { value: "para_ansiedad", label: "Anti ansiedad" },
  { value: "cena_liviana", label: "Cena liviana" },
];

interface Recipe {
  name: string;
  usedIngredients: string[];
  steps: string[];
  estimatedTime: string;
  difficulty: string;
  antiAnxietyTip: string;
}

// ── API helpers ───────────────────────────────────────────────────

const BASE = (import.meta.env.BASE_URL ?? "").replace(/\/$/, "");

async function generateRecipesApi(ingredients: string[], objetivo?: string): Promise<Recipe[]> {
  const res = await fetch(`${BASE}/api/recipes/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ingredients, ...(objetivo ? { objetivo } : {}) }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string; code?: string };
    if (res.status === 401) throw new Error("Necesitás iniciar sesión para generar recetas.");
    if (err.code === "trial_expired") throw new Error("Tu período de prueba venció. Activá Premium para continuar.");
    throw new Error(err.error ?? "Error al generar receta. Intentá de nuevo.");
  }
  const data = await res.json() as { recipes: Recipe[] };
  return data.recipes ?? [];
}

async function saveToHistory(
  recipe: Recipe,
  userEmail: string,
): Promise<string | null> {
  const res = await fetch(`${BASE}/api/userdata/history`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipes: [
        {
          name: recipe.name,
          usedIngredients: recipe.usedIngredients,
          steps: recipe.steps,
          estimatedTime: recipe.estimatedTime,
          difficulty: recipe.difficulty,
          antiAnxietyTip: recipe.antiAnxietyTip,
        },
      ],
    }),
  });
  if (!res.ok) return null;
  const data = await res.json() as { ids: string[] };
  return data.ids?.[0] ?? null;
}

async function saveToFavorites(
  recipe: Recipe,
): Promise<string | null> {
  const res = await fetch(`${BASE}/api/userdata/favorites`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipe_name: recipe.name,
      ingredients: recipe.usedIngredients,
      instructions: recipe.steps,
    }),
  });
  if (!res.ok) return null;
  const data = await res.json() as { id: string };
  return data.id ?? null;
}

// ── Component ─────────────────────────────────────────────────────

interface RecipeState {
  recipe: Recipe;
  historyId: string | null;
  favoriteId: string | null;
  savingFav: boolean;
  savedFav: boolean;
}

export default function Recipes() {
  const [ingredientInput, setIngredientInput] = useState("");
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [objetivo, setObjetivo] = useState<Objetivo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<RecipeState[]>([]);

  const { isPremium, user } = useAuth();
  const abortRef = useRef<AbortController | null>(null);

  // ── Ingredient management ────────────────────────────────────────

  const addIngredient = () => {
    const trimmed = ingredientInput.trim();
    if (trimmed && !ingredients.includes(trimmed)) {
      setIngredients((prev) => [...prev, trimmed]);
      setIngredientInput("");
    }
  };

  const removeIngredient = (ing: string) =>
    setIngredients((prev) => prev.filter((i) => i !== ing));

  // ── Generate ─────────────────────────────────────────────────────

  const handleGenerate = async () => {
    if (ingredients.length === 0) return;
    abortRef.current?.abort();
    setLoading(true);
    setError(null);
    setResults([]);

    try {
      const recipes = await generateRecipesApi(
        ingredients,
        isPremium && objetivo ? objetivo : undefined,
      );

      if (recipes.length === 0) {
        setError("No se pudieron generar recetas. Intentá con otros ingredientes.");
        return;
      }

      // Show recipes immediately, save to history in background
      const initial: RecipeState[] = recipes.map((r) => ({
        recipe: r,
        historyId: null,
        favoriteId: null,
        savingFav: false,
        savedFav: false,
      }));
      setResults(initial);

      // Auto-save each recipe to recipe_history (background, non-blocking)
      if (user?.email) {
        recipes.forEach((recipe, idx) => {
          saveToHistory(recipe, user.email).then((historyId) => {
            if (historyId) {
              setResults((prev) =>
                prev.map((r, i) => (i === idx ? { ...r, historyId } : r))
              );
            }
          });
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  // ── Save to favorites ────────────────────────────────────────────

  const handleSaveFavorite = async (idx: number) => {
    const entry = results[idx];
    if (!entry || entry.savingFav || entry.savedFav) return;

    setResults((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, savingFav: true } : r))
    );

    const favId = await saveToFavorites(entry.recipe);

    setResults((prev) =>
      prev.map((r, i) =>
        i === idx
          ? { ...r, savingFav: false, savedFav: !!favId, favoriteId: favId }
          : r
      )
    );
  };

  // ── Render ───────────────────────────────────────────────────────

  return (
    <Layout title="¿Qué cocino con lo que tengo?">
      <div className="flex-1 flex flex-col p-6">

        {/* Instruction */}
        <p className="text-muted-foreground text-[15px] leading-relaxed mb-6">
          Anotá los ingredientes que tenés a mano. No te preocupes si son pocos, encontraremos algo reconfortante.
        </p>

        {/* Ingredient input */}
        <div className="flex gap-2 mb-4">
          <Input
            placeholder="Ej. huevos, tomate, arroz..."
            value={ingredientInput}
            onChange={(e) => setIngredientInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") addIngredient(); }}
            className="h-12 rounded-xl border-border/60 bg-card focus-visible:ring-primary/50 text-base"
          />
          <Button
            onClick={addIngredient}
            variant="secondary"
            className="h-12 px-6 rounded-xl font-medium"
          >
            Añadir
          </Button>
        </div>

        {/* Ingredient chips */}
        <div className="flex flex-wrap gap-2 min-h-[40px] mb-6">
          <AnimatePresence>
            {ingredients.map((ing) => (
              <motion.div
                key={ing}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="bg-accent/40 text-accent-foreground px-3 py-1.5 rounded-lg flex items-center gap-2 text-sm"
              >
                {ing}
                <button
                  onClick={() => removeIngredient(ing)}
                  className="opacity-60 hover:opacity-100 transition-opacity"
                >
                  <X size={14} />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Objetivo selector — premium only */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Target size={15} className={isPremium ? "text-primary" : "text-muted-foreground"} />
            <p className="text-sm font-medium text-foreground">Objetivo de la receta</p>
            {!isPremium && (
              <span className="inline-flex items-center gap-1 text-[11px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                <Lock size={9} strokeWidth={2.5} />
                Premium
              </span>
            )}
          </div>

          {isPremium ? (
            <div className="flex flex-wrap gap-2">
              {OBJETIVOS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setObjetivo(objetivo === value ? null : value)}
                  className={`text-sm px-3 py-1.5 rounded-xl border transition-all ${
                    objetivo === value
                      ? "bg-primary text-primary-foreground border-primary font-medium"
                      : "bg-card text-foreground/70 border-border/60 hover:border-primary/40 hover:text-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          ) : (
            <div className="relative">
              <div className="flex flex-wrap gap-2 pointer-events-none select-none opacity-40">
                {OBJETIVOS.map(({ value, label }) => (
                  <span key={value} className="text-sm px-3 py-1.5 rounded-xl border bg-card text-foreground/70 border-border/60">
                    {label}
                  </span>
                ))}
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Link href="/premium">
                  <button className="flex items-center gap-2 bg-card border border-primary/30 text-primary text-xs font-medium px-4 py-2 rounded-xl shadow-sm hover:bg-primary/5 transition-colors">
                    <Lock size={11} strokeWidth={2} />
                    Disponible en Premium
                  </button>
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Generate button */}
        <Button
          onClick={handleGenerate}
          disabled={ingredients.length === 0 || loading}
          className="w-full h-14 rounded-xl text-[17px] font-medium mb-6 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="animate-spin" size={20} />
              Cocinando ideas para ti...
            </span>
          ) : (
            "Generar receta"
          )}
        </Button>

        {/* Error banner */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-3 bg-destructive/10 border border-destructive/20 rounded-xl p-4 mb-6"
          >
            <AlertCircle size={18} className="text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-destructive">{error}</p>
              {error.includes("sesión") && (
                <Link href="/login">
                  <button className="text-xs text-destructive underline mt-1">
                    Iniciar sesión
                  </button>
                </Link>
              )}
              {error.includes("prueba") && (
                <Link href="/premium">
                  <button className="text-xs text-destructive underline mt-1">
                    Ver planes Premium
                  </button>
                </Link>
              )}
            </div>
          </motion.div>
        )}

        {/* Results */}
        <div className="flex-1 pb-10">
          {results.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col gap-6"
            >
              <h3 className="font-serif text-2xl text-foreground">
                {results.length === 1 ? "Tu receta" : "Sugerencias para ti"}
              </h3>

              {results.map((entry, idx) => {
                const { recipe, savingFav, savedFav } = entry;
                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.12 }}
                    className="bg-card rounded-2xl border border-border/60 shadow-sm overflow-hidden"
                  >
                    {/* Header */}
                    <div className="p-5 pb-4">
                      <h4 className="font-serif text-[20px] font-medium text-foreground leading-snug mb-3">
                        {recipe.name}
                      </h4>

                      <div className="flex flex-wrap gap-2 mb-4">
                        {recipe.estimatedTime && (
                          <Badge variant="secondary" className="bg-secondary/30 text-secondary-foreground font-normal rounded-md px-2 py-0.5 border-none flex gap-1.5 items-center">
                            <Clock size={12} /> {recipe.estimatedTime}
                          </Badge>
                        )}
                        {recipe.difficulty && (
                          <Badge variant="outline" className="font-normal rounded-md px-2 py-0.5 border-border/60 flex gap-1.5 items-center">
                            <ChefHat size={12} className="opacity-70" /> {recipe.difficulty}
                          </Badge>
                        )}
                      </div>

                      {/* Ingredients */}
                      {recipe.usedIngredients?.length > 0 && (
                        <div className="mb-4">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                            Ingredientes usados
                          </p>
                          <p className="text-sm text-foreground/80">
                            {recipe.usedIngredients.join(", ")}
                          </p>
                        </div>
                      )}

                      {/* Steps */}
                      {recipe.steps?.length > 0 && (
                        <div className="mb-5">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                            Pasos sencillos
                          </p>
                          <ul className="space-y-2">
                            {recipe.steps.map((step, i) => (
                              <li key={i} className="text-[15px] text-foreground/90 flex gap-3">
                                <span className="text-primary/60 font-serif shrink-0">{i + 1}.</span>
                                <span className="leading-relaxed">{step}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Anti-anxiety tip */}
                      {recipe.antiAnxietyTip && (
                        <div className="bg-primary/5 rounded-xl p-4 flex gap-3 items-start border border-primary/10">
                          <Leaf size={18} className="text-primary shrink-0 mt-0.5" />
                          <p className="text-[14px] text-foreground/80 italic leading-relaxed">
                            "{recipe.antiAnxietyTip}"
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Action bar */}
                    <div className="border-t border-border/40">
                      <button
                        onClick={() => handleSaveFavorite(idx)}
                        disabled={savingFav || savedFav}
                        className={`w-full flex items-center justify-center gap-2 py-3.5 text-sm font-medium transition-colors ${
                          savedFav
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:text-primary hover:bg-primary/5"
                        }`}
                      >
                        {savingFav ? (
                          <>
                            <Loader2 size={15} className="animate-spin" />
                            Guardando...
                          </>
                        ) : savedFav ? (
                          <>
                            <Check size={15} />
                            Guardada en favoritos
                          </>
                        ) : (
                          <>
                            <Star size={15} />
                            Guardar en favoritos
                          </>
                        )}
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}

          {/* Empty state */}
          {!loading && results.length === 0 && !error && (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-60 mt-12">
              <ChefHat size={48} strokeWidth={1} className="mb-4 text-muted-foreground" />
              <p className="text-muted-foreground text-sm max-w-[200px]">
                Añadí ingredientes y generá una receta reconfortante.
              </p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
