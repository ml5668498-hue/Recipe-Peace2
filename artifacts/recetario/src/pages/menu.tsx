import { useState, useEffect, useRef } from "react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { useGenerateMenu } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { Loader2, CalendarHeart, Clock, ChefHat, Sparkles, Star } from "lucide-react";
import { MenuInputType, MenuInputQuickOption } from "@workspace/api-client-react/src/generated/api.schemas";
import { Badge } from "@/components/ui/badge";
import { useRecetario } from "@/hooks/use-recetario";

export default function Menu() {
  const [type, setType] = useState<MenuInputType>("day");
  const [quickOption, setQuickOption] = useState<MenuInputQuickOption | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  const generateMenu = useGenerateMenu();
  const { addMenu, toggleFavorite, entries } = useRecetario();

  const prevSuccess = useRef(false);

  // Auto-save to history on new generation
  useEffect(() => {
    if (generateMenu.isSuccess && generateMenu.data && !prevSuccess.current) {
      const label = type === "week" ? "Menú semanal" : "Menú del día";
      const id = addMenu(generateMenu.data.days as any, label);
      setSavedId(id);
      prevSuccess.current = true;
    }
    if (!generateMenu.isSuccess) {
      prevSuccess.current = false;
    }
  }, [generateMenu.isSuccess, generateMenu.data, type, addMenu]);

  const handleGenerate = () => {
    setSavedId(null);
    generateMenu.mutate({ data: { type, quickOption: quickOption || undefined } });
  };

  const isFav = savedId ? (entries.find((e) => e.id === savedId)?.isFavorite ?? false) : false;

  return (
    <Layout title="Menú Anti Ansiedad">
      <div className="flex-1 flex flex-col p-6">
        <div className="mb-8">
          <p className="text-muted-foreground text-[15px] leading-relaxed mb-6">
            Déjanos decidir por ti. Selecciona cómo prefieres organizar tus comidas y te prepararemos un menú amable y sin complicaciones.
          </p>

          <div className="space-y-6">
            <div>
              <p className="text-sm font-medium text-foreground mb-3">¿Para cuánto tiempo?</p>
              <div className="flex gap-3">
                <Button
                  variant={type === "day" ? "default" : "outline"}
                  className={`flex-1 h-12 rounded-xl ${type === "day" ? "bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-none border-transparent" : "border-border/60 bg-transparent"}`}
                  onClick={() => setType("day")}
                >
                  Un día a la vez
                </Button>
                <Button
                  variant={type === "week" ? "default" : "outline"}
                  className={`flex-1 h-12 rounded-xl ${type === "week" ? "bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-none border-transparent" : "border-border/60 bg-transparent"}`}
                  onClick={() => setType("week")}
                >
                  Semana entera
                </Button>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-foreground mb-3">¿Alguna preferencia? (Opcional)</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: "10min" as const, label: "En 10 minutos" },
                  { value: "20min" as const, label: "En 20 minutos" },
                  { value: "economico" as const, label: "Económico" },
                  { value: "familiar" as const, label: "Familiar" },
                ].map((opt) => (
                  <Button
                    key={opt.value}
                    variant={quickOption === opt.value ? "default" : "outline"}
                    className={`h-11 rounded-xl text-sm ${quickOption === opt.value ? "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 shadow-none" : "border-border/60 bg-transparent text-foreground/70"}`}
                    onClick={() => setQuickOption(quickOption === opt.value ? null : opt.value)}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <Button
          onClick={handleGenerate}
          disabled={generateMenu.isPending}
          className="w-full h-14 rounded-xl text-[17px] font-medium mb-8 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
        >
          {generateMenu.isPending ? (
            <span className="flex items-center gap-2">
              <Loader2 className="animate-spin" size={20} />
              Pensando un menú tranquilo...
            </span>
          ) : (
            "Crear menú"
          )}
        </Button>

        <div className="flex-1 pb-8">
          {generateMenu.isSuccess && generateMenu.data && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col gap-8"
            >
              {/* Save as favorite button */}
              {savedId && (
                <motion.button
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => toggleFavorite(savedId)}
                  className={`self-end flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl border transition-colors ${
                    isFav
                      ? "bg-primary/10 text-primary border-primary/20"
                      : "bg-card text-muted-foreground border-border/60 hover:text-primary hover:border-primary/20"
                  }`}
                >
                  <Star size={15} className={isFav ? "fill-primary" : ""} />
                  {isFav ? "Guardado en favoritos" : "Guardar menú"}
                </motion.button>
              )}

              {generateMenu.data.days.map((day, dayIndex) => (
                <div key={dayIndex} className="flex flex-col gap-4">
                  {day.dayLabel && (
                    <h3 className="font-serif text-2xl text-foreground mt-4 mb-2">{day.dayLabel}</h3>
                  )}

                  {[
                    { label: "Desayuno", meal: day.breakfast },
                    { label: "Almuerzo", meal: day.lunch },
                    { label: "Merienda", meal: day.snack },
                    { label: "Cena", meal: day.dinner },
                    { label: "Snack Opcional", meal: day.optionalSnack },
                  ].map(({ label, meal }, mealIndex) => (
                    <motion.div
                      key={mealIndex}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: dayIndex * 0.2 + mealIndex * 0.1 }}
                      className="bg-card rounded-2xl p-5 border border-border/60 shadow-sm relative overflow-hidden"
                    >
                      <div className="absolute top-0 left-0 w-1.5 h-full bg-secondary/60" />
                      <div className="pl-2">
                        <div className="flex justify-between items-start mb-2">
                          <p className="text-xs font-medium text-primary uppercase tracking-wider">{label}</p>
                        </div>
                        <h4 className="font-serif text-xl font-medium text-foreground mb-3">{meal.name}</h4>

                        <div className="flex flex-wrap gap-2 mb-4">
                          <Badge
                            variant="secondary"
                            className="bg-secondary/30 text-secondary-foreground hover:bg-secondary/40 font-normal rounded-md px-2 py-0.5 border-none flex gap-1.5 items-center"
                          >
                            <Clock size={12} /> {meal.estimatedTime}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="font-normal rounded-md px-2 py-0.5 border-border/60 flex gap-1.5 items-center"
                          >
                            <ChefHat size={12} className="opacity-70" /> {meal.difficulty}
                          </Badge>
                        </div>

                        <p className="text-[14px] text-foreground/70 mb-4">
                          <span className="font-medium text-foreground/90">Necesitas: </span>
                          {meal.mainIngredients.join(", ")}
                        </p>

                        <div className="bg-background rounded-xl p-3.5 flex gap-3 items-center border border-border/40">
                          <Sparkles size={16} className="text-accent-foreground/60 shrink-0" />
                          <p className="text-[14px] text-foreground/80 leading-snug">"{meal.calmMessage}"</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ))}
            </motion.div>
          )}

          {!generateMenu.isPending && !generateMenu.isSuccess && (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-60 mt-12">
              <CalendarHeart size={48} strokeWidth={1} className="mb-4 text-muted-foreground" />
              <p className="text-muted-foreground text-sm max-w-[200px]">
                Deja que nosotros nos preocupemos de qué comer.
              </p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
