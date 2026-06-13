import { useState, useEffect, useRef } from "react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useGenerateRecipes } from "@workspace/api-client-react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Leaf, Clock, X, ChefHat, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useRecetario } from "@/hooks/use-recetario";

export default function Recipes() {
  const [ingredientInput, setIngredientInput] = useState("");
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [savedIds, setSavedIds] = useState<string[]>([]);

  const generateRecipes = useGenerateRecipes();
  const { addRecipes, toggleFavorite, entries } = useRecetario();

  const prevSuccess = useRef(false);

  // Auto-save all recipes to history when a new generation completes
  useEffect(() => {
    if (generateRecipes.isSuccess && generateRecipes.data && !prevSuccess.current) {
      const ids = addRecipes(generateRecipes.data.recipes as any);
      setSavedIds(ids);
      prevSuccess.current = true;
    }
    if (!generateRecipes.isSuccess) {
      prevSuccess.current = false;
    }
  }, [generateRecipes.isSuccess, generateRecipes.data, addRecipes]);

  const handleAddIngredient = () => {
    const trimmed = ingredientInput.trim();
    if (trimmed && !ingredients.includes(trimmed)) {
      setIngredients([...ingredients, trimmed]);
      setIngredientInput("");
    }
  };

  const handleRemoveIngredient = (ing: string) => {
    setIngredients(ingredients.filter((i) => i !== ing));
  };

  const handleGenerate = () => {
    if (ingredients.length === 0) return;
    setSavedIds([]);
    generateRecipes.mutate({ data: { ingredients } });
  };

  const isFavorite = (index: number) => {
    const id = savedIds[index];
    if (!id) return false;
    return entries.find((e) => e.id === id)?.isFavorite ?? false;
  };

  return (
    <Layout title="¿Qué cocino con lo que tengo?">
      <div className="flex-1 flex flex-col p-6">
        <div className="mb-8">
          <p className="text-muted-foreground text-[15px] leading-relaxed mb-6">
            Anota los ingredientes que tienes a mano. No te preocupes si son pocos, encontraremos algo reconfortante para preparar.
          </p>

          <div className="flex gap-2 mb-4">
            <Input
              placeholder="Ej. huevos, tomate, arroz..."
              value={ingredientInput}
              onChange={(e) => setIngredientInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddIngredient();
              }}
              className="h-12 rounded-xl border-border/60 bg-card focus-visible:ring-primary/50 text-base"
            />
            <Button
              onClick={handleAddIngredient}
              variant="secondary"
              className="h-12 px-6 rounded-xl font-medium"
            >
              Añadir
            </Button>
          </div>

          <div className="flex flex-wrap gap-2 min-h-[40px]">
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
                    onClick={() => handleRemoveIngredient(ing)}
                    className="opacity-60 hover:opacity-100 transition-opacity"
                  >
                    <X size={14} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        <Button
          onClick={handleGenerate}
          disabled={ingredients.length === 0 || generateRecipes.isPending}
          className="w-full h-14 rounded-xl text-[17px] font-medium mb-8 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
        >
          {generateRecipes.isPending ? (
            <span className="flex items-center gap-2">
              <Loader2 className="animate-spin" size={20} />
              Cocinando ideas para ti...
            </span>
          ) : (
            "Generar recetas"
          )}
        </Button>

        <div className="flex-1">
          {generateRecipes.isSuccess && generateRecipes.data && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col gap-6 pb-8"
            >
              <h3 className="font-serif text-2xl text-foreground">Sugerencias para ti</h3>

              {generateRecipes.data.recipes.map((recipe, index) => {
                const fav = isFavorite(index);
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.15 }}
                    className="bg-card rounded-2xl p-5 border border-border/60 shadow-sm"
                  >
                    <div className="flex justify-between items-start mb-3 gap-4">
                      <h4 className="font-serif text-[19px] font-medium text-foreground leading-snug">
                        {recipe.name}
                      </h4>
                      {/* Star / Favorite button */}
                      {savedIds[index] && (
                        <button
                          onClick={() => toggleFavorite(savedIds[index])}
                          className={`shrink-0 p-2 rounded-xl transition-colors ${
                            fav
                              ? "bg-primary/10 text-primary"
                              : "bg-muted/40 text-muted-foreground hover:text-primary hover:bg-primary/10"
                          }`}
                          title={fav ? "Quitar de favoritos" : "Guardar como favorita"}
                        >
                          <Star size={18} className={fav ? "fill-primary" : ""} />
                        </button>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4">
                      <Badge
                        variant="secondary"
                        className="bg-secondary/30 text-secondary-foreground hover:bg-secondary/40 font-normal rounded-md px-2 py-0.5 border-none flex gap-1.5 items-center"
                      >
                        <Clock size={12} /> {recipe.estimatedTime}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="font-normal rounded-md px-2 py-0.5 border-border/60 flex gap-1.5 items-center"
                      >
                        <ChefHat size={12} className="opacity-70" /> {recipe.difficulty}
                      </Badge>
                    </div>

                    <div className="mb-4">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                        Ingredientes usados
                      </p>
                      <p className="text-sm text-foreground/80">{recipe.usedIngredients.join(", ")}</p>
                    </div>

                    <div className="mb-5">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                        Pasos sencillos
                      </p>
                      <ul className="space-y-2">
                        {recipe.steps.map((step, i) => (
                          <li key={i} className="text-[15px] text-foreground/90 flex gap-3">
                            <span className="text-primary/60 font-serif">{i + 1}.</span>
                            <span className="leading-relaxed">{step}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="bg-primary/5 rounded-xl p-4 flex gap-3 items-start border border-primary/10">
                      <Leaf size={18} className="text-primary shrink-0 mt-0.5" />
                      <p className="text-[14px] text-foreground/80 italic leading-relaxed">
                        "{recipe.antiAnxietyTip}"
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}

          {!generateRecipes.isPending && !generateRecipes.isSuccess && (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-60 mt-12">
              <ChefHat size={48} strokeWidth={1} className="mb-4 text-muted-foreground" />
              <p className="text-muted-foreground text-sm max-w-[200px]">
                Añade algunos ingredientes y tocaremos algo mágico.
              </p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
