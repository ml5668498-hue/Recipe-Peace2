import { useState, useEffect, useRef } from "react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2, Leaf, Clock, X, ChefHat, Star, Lock,
  Target, AlertCircle, ShoppingBasket, ListChecks,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/auth";
import { Link } from "wouter";
import { useGenerateRecipes } from "@workspace/api-client-react";
import { useRecetario } from "@/hooks/use-recetario";

// ── Objetivo options (premium only) ──────────────────────────────

type Objetivo =
  | "rapido" | "economico" | "familiar" | "saludable"
  | "sin_harinas" | "sin_azucar" | "para_ansiedad" | "cena_liviana";

const OBJETIVOS: { value: Objetivo; label: string }[] = [
  { value: "rapido",       label: "Rápida" },
  { value: "economico",    label: "Económica" },
  { value: "familiar",     label: "Familiar" },
  { value: "saludable",    label: "Saludable" },
  { value: "sin_harinas",  label: "Sin harinas" },
  { value: "sin_azucar",   label: "Sin azúcar" },
  { value: "para_ansiedad", label: "Anti ansiedad" },
  { value: "cena_liviana", label: "Cena liviana" },
];

// ── Component ─────────────────────────────────────────────────────

export default function Recipes() {
  const [ingredientInput, setIngredientInput] = useState("");
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [objetivo, setObjetivo] = useState<Objetivo | null>(null);
  const [savedIds, setSavedIds] = useState<string[]>([]);

  const { isPremium } = useAuth();

  // Same hooks as /menu
  const generateRecipes = useGenerateRecipes();
  const { addRecipes, toggleFavorite, entries } = useRecetario();

  const prevSuccess = useRef(false);

  // Auto-save every generated recipe to recipe_history (same pattern as menu.tsx)
  useEffect(() => {
    if (generateRecipes.isSuccess && generateRecipes.data && !prevSuccess.current) {
      prevSuccess.current = true;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      addRecipes(generateRecipes.data.recipes as any[]).then((ids) => {
        setSavedIds(ids);
      });
    }
    if (!generateRecipes.isSuccess) {
      prevSuccess.current = false;
    }
  }, [generateRecipes.isSuccess, generateRecipes.data, addRecipes]);

  // ── Ingredient management ───────────────────────────────────────

  const addIngredient = () => {
    const trimmed = ingredientInput.trim();
    if (trimmed && !ingredients.includes(trimmed)) {
      setIngredients((prev) => [...prev, trimmed]);
      setIngredientInput("");
    }
  };

  const removeIngredient = (ing: string) =>
    setIngredients((prev) => prev.filter((i) => i !== ing));

  // ── Generate (same call pattern as menu) ───────────────────────

  const handleGenerate = () => {
    setSavedIds([]);
    generateRecipes.mutate({
      data: {
        ingredients,
        ...(isPremium && objetivo ? { objetivo } : {}),
      },
    });
  };

  // ── Error message helper ────────────────────────────────────────

  const errorMessage = (() => {
    if (!generateRecipes.isError) return null;
    const err = generateRecipes.error as { data?: { error?: string; code?: string } } | null;
    const code = err?.data?.code;
    if (code === "trial_expired") return "Tu período de prueba venció. Activá Premium para continuar.";
    return err?.data?.error ?? "No se pudo generar la receta. Intentá de nuevo.";
  })();

  // ── Render ──────────────────────────────────────────────────────

  return (
    <Layout title="¿Qué cocino con lo que tengo?">
      <div className="flex-1 flex flex-col p-6">

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
            className="h-12 px-5 rounded-xl font-medium"
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
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                className="bg-accent/40 text-accent-foreground px-3 py-1.5 rounded-lg flex items-center gap-2 text-sm"
              >
                {ing}
                <button
                  onClick={() => removeIngredient(ing)}
                  className="opacity-60 hover:opacity-100 transition-opacity"
                >
                  <X size={13} />
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
                  <span
                    key={value}
                    className="text-sm px-3 py-1.5 rounded-xl border bg-card text-foreground/70 border-border/60"
                  >
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
          disabled={ingredients.length === 0 || generateRecipes.isPending}
          className="w-full h-14 rounded-xl text-[17px] font-medium mb-6 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
        >
          {generateRecipes.isPending ? (
            <span className="flex items-center gap-2">
              <Loader2 className="animate-spin" size={20} />
              Cocinando ideas para ti...
            </span>
          ) : (
            "Generar receta"
          )}
        </Button>

        {/* Error banner */}
        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-3 bg-destructive/10 border border-destructive/20 rounded-xl p-4 mb-6"
          >
            <AlertCircle size={18} className="text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-destructive">{errorMessage}</p>
              {errorMessage.includes("sesión") && (
                <Link href="/login">
                  <button className="text-xs text-destructive underline mt-1">
                    Iniciar sesión
                  </button>
                </Link>
              )}
              {errorMessage.includes("Premium") && (
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
          {generateRecipes.isSuccess && generateRecipes.data && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col gap-6"
            >
              <h3 className="font-serif text-2xl text-foreground">
                {generateRecipes.data.recipes.length === 1 ? "Tu receta" : "Sugerencias para ti"}
              </h3>

              {generateRecipes.data.recipes.map((recipe, idx) => {
                const savedId = savedIds[idx] ?? null;
                const isFav = savedId
                  ? (entries.find((e) => e.id === savedId)?.isFavorite ?? false)
                  : false;

                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.12 }}
                    className="bg-card rounded-2xl border border-border/60 shadow-sm overflow-hidden"
                  >
                    {/* Card body */}
                    <div className="p-5 pb-4">
                      <h4 className="font-serif text-[20px] font-medium text-foreground leading-snug mb-3">
                        {recipe.name}
                      </h4>

                      <div className="flex flex-wrap gap-2 mb-4">
                        {recipe.estimatedTime && (
                          <Badge
                            variant="secondary"
                            className="bg-secondary/30 text-secondary-foreground font-normal rounded-md px-2 py-0.5 border-none flex gap-1.5 items-center"
                          >
                            <Clock size={12} /> {recipe.estimatedTime}
                          </Badge>
                        )}
                        {recipe.difficulty && (
                          <Badge
                            variant="outline"
                            className="font-normal rounded-md px-2 py-0.5 border-border/60 flex gap-1.5 items-center"
                          >
                            <ChefHat size={12} className="opacity-70" /> {recipe.difficulty}
                          </Badge>
                        )}
                      </div>

                      {/* Ingredients */}
                      {recipe.usedIngredients?.length > 0 && (
                        <div className="mb-4">
                          <div className="flex items-center gap-2 mb-2">
                            <ShoppingBasket size={14} className="text-primary/70" />
                            <p className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
                              Ingredientes
                            </p>
                          </div>
                          <ul className="space-y-1 pl-1">
                            {recipe.usedIngredients.map((ing, i) => (
                              <li key={i} className="flex items-start gap-2 text-[14px] text-foreground/75">
                                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-secondary shrink-0" />
                                {ing}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Steps */}
                      {recipe.steps?.length > 0 && (
                        <div className="mb-5">
                          <div className="flex items-center gap-2 mb-2">
                            <ListChecks size={14} className="text-primary/70" />
                            <p className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
                              Preparación
                            </p>
                          </div>
                          <ol className="space-y-2 pl-1">
                            {recipe.steps.map((step, i) => (
                              <li key={i} className="flex items-start gap-3 text-[14px] text-foreground/75 leading-snug">
                                <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-secondary/40 text-foreground/70 text-xs flex items-center justify-center font-medium">
                                  {i + 1}
                                </span>
                                {step}
                              </li>
                            ))}
                          </ol>
                        </div>
                      )}

                      {/* Anti-anxiety tip */}
                      {recipe.antiAnxietyTip && (
                        <div className="bg-primary/5 rounded-xl p-4 flex gap-3 items-start border border-primary/10">
                          <Leaf size={17} className="text-primary shrink-0 mt-0.5" />
                          <p className="text-[13px] text-foreground/80 italic leading-relaxed">
                            "{recipe.antiAnxietyTip}"
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Favorite button (same toggleFavorite pattern as menu) */}
                    {savedId && (
                      <div className="border-t border-border/40">
                        <button
                          onClick={() => toggleFavorite(savedId)}
                          className={`w-full flex items-center justify-center gap-2 py-3.5 text-sm font-medium transition-colors ${
                            isFav
                              ? "bg-primary/10 text-primary"
                              : "text-muted-foreground hover:text-primary hover:bg-primary/5"
                          }`}
                        >
                          <Star size={15} className={isFav ? "fill-primary" : ""} />
                          {isFav ? "Guardada en favoritos" : "Guardar en favoritos"}
                        </button>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </motion.div>
          )}

          {/* Empty state */}
          {!generateRecipes.isPending && !generateRecipes.isSuccess && !generateRecipes.isError && (
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
