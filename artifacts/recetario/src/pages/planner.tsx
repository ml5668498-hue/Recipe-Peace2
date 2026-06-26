import { useState, useEffect, useRef } from "react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useGeneratePlanner } from "@workspace/api-client-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2, ListTodo, ShoppingBag, PiggyBank, Clock, ChefHat,
  Star, ShoppingBasket, ListChecks, Lightbulb, Pencil, Check, X,
  Save,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useRecetario, type PlannerData, type PlannerDay, type PlannerMeal } from "@/hooks/use-recetario";
import { PremiumGate } from "@/components/premium-gate";
import { useAuth } from "@/context/auth";

// ── Meal editor ───────────────────────────────────────────────────

function EditableMealName({
  value,
  onSave,
}: {
  value: string;
  onSave: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== value) onSave(trimmed);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex gap-2 items-center">
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") { setDraft(value); setEditing(false); }
          }}
          className="flex-1 bg-background border border-primary/40 rounded-lg px-3 py-1.5 text-[16px] font-medium font-serif text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
        />
        <button onClick={commit} className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
          <Check size={14} />
        </button>
        <button onClick={() => { setDraft(value); setEditing(false); }} className="p-1.5 rounded-lg bg-muted/60 text-muted-foreground hover:bg-muted transition-colors">
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 group">
      <h5 className="font-serif text-[18px] font-medium text-foreground leading-snug">{value}</h5>
      <button
        onClick={() => { setDraft(value); setEditing(true); }}
        className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity p-1 rounded text-muted-foreground"
        title="Editar nombre"
      >
        <Pencil size={12} />
      </button>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────

export default function Planner() {
  const [preferences, setPreferences] = useState("");
  const [savedId, setSavedId] = useState<string | null>(null);
  const [localData, setLocalData] = useState<PlannerData | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const { isPremium } = useAuth();
  const generatePlanner = useGeneratePlanner();
  const { addPlanner, updateEntry, toggleFavorite, entries } = useRecetario();

  const prevSuccess = useRef(false);

  useEffect(() => {
    if (generatePlanner.isSuccess && generatePlanner.data && !prevSuccess.current) {
      prevSuccess.current = true;
      const plannerData = generatePlanner.data as PlannerData;
      setLocalData(plannerData);
      addPlanner(plannerData).then((id) => {
        setSavedId(id);
      });
    }
    if (!generatePlanner.isSuccess) {
      prevSuccess.current = false;
    }
  }, [generatePlanner.isSuccess, generatePlanner.data, addPlanner]);

  const handleGenerate = () => {
    setSavedId(null);
    setLocalData(null);
    setSaved(false);
    generatePlanner.mutate({ data: { preferences: preferences || undefined } });
  };

  const handleEditMealName = (dayIdx: number, slot: keyof PlannerDay, newName: string) => {
    if (!localData) return;
    const updatedDays: PlannerDay[] = localData.days.map((day, i) => {
      if (i !== dayIdx) return day;
      return {
        ...day,
        [slot]: { ...(day[slot] as PlannerMeal), name: newName },
      };
    });
    setLocalData({ ...localData, days: updatedDays });
    setSaved(false);
  };

  const handleSaveChanges = async () => {
    if (!savedId || !localData) return;
    setSaving(true);
    await updateEntry(savedId, localData);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const isFav = savedId ? (entries.find((e) => e.id === savedId)?.isFavorite ?? false) : false;

  // Shopping list from planner
  const shoppingList = localData?.shoppingList ?? [];

  const plannerContent = (
    <div className="flex-1 flex flex-col p-6">
      <div className="mb-8">
        <p className="text-muted-foreground text-[15px] leading-relaxed mb-6">
          Planificar con anticipación reduce la carga mental diaria. Generá un menú semanal balanceado con lista de compras incluida.
        </p>

        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">Preferencias especiales (Opcional)</p>
          <Input
            placeholder="Ej. sin lácteos, mucha verdura, económico..."
            value={preferences}
            onChange={(e) => setPreferences(e.target.value)}
            className="h-12 rounded-xl border-border/60 bg-card focus-visible:ring-primary/50 text-base"
          />
        </div>
      </div>

      <Button
        onClick={handleGenerate}
        disabled={generatePlanner.isPending}
        className="w-full h-14 rounded-xl text-[17px] font-medium mb-8 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
      >
        {generatePlanner.isPending ? (
          <span className="flex items-center gap-2">
            <Loader2 className="animate-spin" size={20} />
            Organizando la semana...
          </span>
        ) : (
          "Generar planner semanal"
        )}
      </Button>

      <div className="flex-1 pb-10">
        {localData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col gap-8"
          >
            {/* Top actions */}
            <div className="flex items-center justify-between gap-3">
              {savedId && (
                <button
                  onClick={() => toggleFavorite(savedId)}
                  className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl border transition-colors ${
                    isFav
                      ? "bg-primary/10 text-primary border-primary/20"
                      : "bg-card text-muted-foreground border-border/60 hover:text-primary hover:border-primary/20"
                  }`}
                >
                  <Star size={15} className={isFav ? "fill-primary" : ""} />
                  {isFav ? "Favorito" : "Guardar"}
                </button>
              )}

              {savedId && (
                <button
                  onClick={handleSaveChanges}
                  disabled={saving}
                  className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl border transition-colors ${
                    saved
                      ? "bg-secondary/30 text-secondary-foreground border-secondary/40"
                      : "bg-card text-foreground border-border/60 hover:border-primary/30 hover:text-primary"
                  }`}
                >
                  {saving ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : saved ? (
                    <Check size={13} />
                  ) : (
                    <Save size={13} />
                  )}
                  {saving ? "Guardando..." : saved ? "Cambios guardados" : "Guardar cambios"}
                </button>
              )}
            </div>

            {/* Savings banner */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-accent/30 border border-accent/50 rounded-2xl p-5 flex gap-4 items-center"
            >
              <div className="w-12 h-12 bg-accent/60 rounded-full flex items-center justify-center text-accent-foreground shrink-0">
                <PiggyBank size={24} strokeWidth={1.5} />
              </div>
              <p className="text-[15px] font-medium text-foreground leading-snug">
                {localData.weeklySavingsMessage}
              </p>
            </motion.div>

            {/* Shopping list */}
            <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-6 border-b border-border/50 pb-4">
                <ShoppingBag size={22} className="text-primary" />
                <h3 className="font-serif text-xl font-medium text-foreground">Lista de compras</h3>
              </div>
              <div className="space-y-6">
                {shoppingList.map((cat, i) => (
                  <div key={i}>
                    <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
                      {cat.category}
                    </h4>
                    <ul className="space-y-2">
                      {cat.items.map((item, j) => (
                        <li key={j} className="flex items-start gap-3">
                          <div className="w-5 h-5 rounded-full border border-border/80 shrink-0 mt-0.5 flex items-center justify-center" />
                          <span className="text-[15px] text-foreground/90">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            {/* Weekly days */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-serif text-2xl text-foreground">Tu semana</h3>
                <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-lg">
                  Toca el lápiz para editar
                </span>
              </div>

              <div className="space-y-8">
                {localData.days.map((day, dayIndex) => (
                  <div key={dayIndex}>
                    <h4 className="font-medium text-lg text-foreground mb-4 sticky top-16 bg-background/95 backdrop-blur py-2 z-10">
                      {day.day}
                    </h4>
                    <div className="flex flex-col gap-4">
                      {(
                        [
                          { label: "Desayuno", slot: "breakfast" as const },
                          { label: "Almuerzo", slot: "lunch" as const },
                          { label: "Merienda", slot: "snack" as const },
                          { label: "Cena", slot: "dinner" as const },
                        ] as { label: string; slot: keyof PlannerDay }[]
                      ).map(({ label, slot }, mealIndex) => {
                        const meal = day[slot] as PlannerMeal;
                        return (
                          <motion.div
                            key={mealIndex}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: dayIndex * 0.05 + mealIndex * 0.05 }}
                            className="bg-card rounded-2xl p-5 border border-border/60 shadow-sm relative overflow-hidden"
                          >
                            <div className="absolute top-0 left-0 w-1.5 h-full bg-primary/20" />
                            <div className="pl-2">
                              <p className="text-xs font-medium text-primary uppercase tracking-wider mb-2">
                                {label}
                              </p>

                              {/* Editable meal name */}
                              <div className="mb-3">
                                <EditableMealName
                                  value={meal.name}
                                  onSave={(newName) => handleEditMealName(dayIndex, slot, newName)}
                                />
                              </div>

                              <div className="flex flex-wrap gap-2 mb-4">
                                <Badge variant="secondary" className="bg-secondary/20 text-secondary-foreground font-normal rounded-md px-2 py-0.5 border-none text-xs flex gap-1 items-center">
                                  <Clock size={10} /> {meal.estimatedTime}
                                </Badge>
                                <Badge variant="outline" className="font-normal rounded-md px-2 py-0.5 border-border/60 text-xs flex gap-1 items-center">
                                  <ChefHat size={10} className="opacity-70" /> {meal.difficulty}
                                </Badge>
                                {meal.tags.map((tag, t) => (
                                  <Badge key={t} variant="secondary" className="bg-primary/10 text-primary font-normal rounded-md px-2 py-0.5 border-none text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>

                              {/* Only show full detail if meal has ingredients */}
                              {"ingredients" in meal && Array.isArray((meal as unknown as { ingredients: string[] }).ingredients) && (
                                <>
                                  <div className="mb-4">
                                    <div className="flex items-center gap-2 mb-2">
                                      <ShoppingBasket size={13} className="text-primary/70" />
                                      <p className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">Ingredientes</p>
                                    </div>
                                    <ul className="space-y-1 pl-1">
                                      {(meal as unknown as { ingredients: string[] }).ingredients.map((ing, i) => (
                                        <li key={i} className="flex items-start gap-2 text-[13px] text-foreground/75">
                                          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-secondary shrink-0" />
                                          {ing}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                  <div className="mb-4">
                                    <div className="flex items-center gap-2 mb-2">
                                      <ListChecks size={13} className="text-primary/70" />
                                      <p className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">Preparación</p>
                                    </div>
                                    <ol className="space-y-2 pl-1">
                                      {(meal as unknown as { steps: string[] }).steps.map((step, i) => (
                                        <li key={i} className="flex items-start gap-3 text-[13px] text-foreground/75 leading-snug">
                                          <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-secondary/40 text-foreground/70 text-xs flex items-center justify-center font-medium">
                                            {i + 1}
                                          </span>
                                          {step}
                                        </li>
                                      ))}
                                    </ol>
                                  </div>
                                </>
                              )}

                              {"antiAnxietyTip" in meal && (
                                <div className="bg-background rounded-xl p-3 flex gap-2.5 items-start border border-border/40">
                                  <Lightbulb size={13} className="text-accent-foreground/60 shrink-0 mt-0.5" />
                                  <p className="text-[12px] text-foreground/70 leading-snug">
                                    <span className="font-semibold text-foreground/80">Tip: </span>
                                    {(meal as unknown as { antiAnxietyTip: string }).antiAnxietyTip}
                                  </p>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {!generatePlanner.isPending && !localData && (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-60 mt-12">
            <ListTodo size={48} strokeWidth={1} className="mb-4 text-muted-foreground" />
            <p className="text-muted-foreground text-sm max-w-[200px]">
              Organizá tus comidas de una vez y disfrutá la semana.
            </p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <Layout title="Planner Familiar">
      {isPremium ? (
        plannerContent
      ) : (
        <div className="flex-1 flex flex-col p-6">
          <p className="text-muted-foreground text-[15px] leading-relaxed mb-6">
            Planificá con anticipación: menú semanal completo con lista de compras y estimación de ahorro.
          </p>
          <PremiumGate message="El Planner Semanal y la Lista de Compras son funciones Premium">
            <div className="rounded-2xl border border-border/60 bg-card p-6 space-y-4">
              <div className="h-10 bg-muted/40 rounded-xl w-3/4" />
              <div className="h-10 bg-muted/40 rounded-xl" />
              <div className="h-14 bg-primary/20 rounded-xl" />
              <div className="space-y-3 pt-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 bg-muted/30 rounded-2xl" />
                ))}
              </div>
            </div>
          </PremiumGate>
        </div>
      )}
    </Layout>
  );
}
