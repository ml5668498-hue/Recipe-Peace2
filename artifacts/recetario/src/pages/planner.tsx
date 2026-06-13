import { useState } from "react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useGeneratePlanner } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { Loader2, ListTodo, ShoppingBag, PiggyBank, Clock, ChefHat } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Planner() {
  const [preferences, setPreferences] = useState("");
  const generatePlanner = useGeneratePlanner();

  const handleGenerate = () => {
    generatePlanner.mutate({ data: { preferences: preferences || undefined } });
  };

  return (
    <Layout title="Planner Familiar">
      <div className="flex-1 flex flex-col p-6">
        <div className="mb-8">
          <p className="text-muted-foreground text-[15px] leading-relaxed mb-6">
            Planificar con anticipación reduce la carga mental diaria. Genera un menú semanal balanceado para todos, con lista de compras incluida.
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
          {generatePlanner.isSuccess && generatePlanner.data && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col gap-10"
            >
              {/* Savings Message */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-accent/30 border border-accent/50 rounded-2xl p-5 flex gap-4 items-center"
              >
                <div className="w-12 h-12 bg-accent/60 rounded-full flex items-center justify-center text-accent-foreground shrink-0">
                  <PiggyBank size={24} strokeWidth={1.5} />
                </div>
                <p className="text-[15px] font-medium text-foreground leading-snug">
                  {generatePlanner.data.weeklySavingsMessage}
                </p>
              </motion.div>

              {/* Shopping List */}
              <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-6 border-b border-border/50 pb-4">
                  <ShoppingBag size={22} className="text-primary" />
                  <h3 className="font-serif text-xl font-medium text-foreground">Lista de compras</h3>
                </div>
                
                <div className="space-y-6">
                  {generatePlanner.data.shoppingList.map((cat, i) => (
                    <div key={i}>
                      <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">{cat.category}</h4>
                      <ul className="space-y-2">
                        {cat.items.map((item, j) => (
                          <li key={j} className="flex items-start gap-3">
                            <div className="w-5 h-5 rounded-full border border-border/80 shrink-0 mt-0.5 flex items-center justify-center"></div>
                            <span className="text-[15px] text-foreground/90">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>

              {/* Days Calendar */}
              <div>
                <h3 className="font-serif text-2xl text-foreground mb-6">Tu semana</h3>
                <div className="space-y-8">
                  {generatePlanner.data.days.map((day, dayIndex) => (
                    <div key={dayIndex}>
                      <h4 className="font-medium text-lg text-foreground mb-4 sticky top-16 bg-background/95 backdrop-blur py-2 z-10">{day.day}</h4>
                      <div className="grid gap-3">
                        {[
                          { label: "Desayuno", meal: day.breakfast },
                          { label: "Almuerzo", meal: day.lunch },
                          { label: "Merienda", meal: day.snack },
                          { label: "Cena", meal: day.dinner }
                        ].map(({ label, meal }, mealIndex) => (
                          <div key={mealIndex} className="bg-card rounded-xl p-4 border border-border/60 shadow-sm">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
                            <h5 className="font-serif text-[17px] font-medium text-foreground mb-2 leading-snug">{meal.name}</h5>
                            
                            <div className="flex flex-wrap gap-2 mt-3">
                              <Badge variant="secondary" className="bg-secondary/20 text-secondary-foreground hover:bg-secondary/30 font-normal rounded-md px-2 py-0.5 border-none text-xs flex gap-1 items-center">
                                <Clock size={10} /> {meal.estimatedTime}
                              </Badge>
                              <Badge variant="outline" className="font-normal rounded-md px-2 py-0.5 border-border/60 text-xs flex gap-1 items-center">
                                <ChefHat size={10} className="opacity-70" /> {meal.difficulty}
                              </Badge>
                              {meal.tags.map((tag, t) => (
                                <Badge key={t} variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20 font-normal rounded-md px-2 py-0.5 border-none text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {!generatePlanner.isPending && !generatePlanner.isSuccess && (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-60 mt-12">
              <ListTodo size={48} strokeWidth={1} className="mb-4 text-muted-foreground" />
              <p className="text-muted-foreground text-sm max-w-[200px]">
                Organiza tus comidas de una vez y disfruta la semana.
              </p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
