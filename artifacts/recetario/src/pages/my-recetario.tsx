import { useState } from "react";
import { Layout } from "@/components/layout";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChefHat,
  CalendarDays,
  ShoppingBag,
  Star,
  Trash2,
  ChevronDown,
  BookHeart,
  Clock,
} from "lucide-react";
import { useRecetario, type SavedEntry } from "@/hooks/use-recetario";
import { PremiumGate } from "@/components/premium-gate";
import { useAuth } from "@/context/auth";

type Tab = "favoritos" | "historial";

function formatDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString("es-AR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function typeIcon(type: SavedEntry["type"]) {
  if (type === "recipe") return <ChefHat size={18} strokeWidth={1.5} />;
  if (type === "menu") return <CalendarDays size={18} strokeWidth={1.5} />;
  return <ShoppingBag size={18} strokeWidth={1.5} />;
}

function typeColor(type: SavedEntry["type"]) {
  if (type === "recipe") return "bg-secondary/30 text-secondary-foreground";
  if (type === "menu") return "bg-accent/40 text-accent-foreground";
  return "bg-primary/10 text-primary";
}

function typeLabel(type: SavedEntry["type"]) {
  if (type === "recipe") return "Receta";
  if (type === "menu") return "Menú";
  return "Planner";
}

function RecipePreview({ entry }: { entry: Extract<SavedEntry, { type: "recipe" }> }) {
  const r = entry.data;
  return (
    <div className="pt-4 border-t border-border/40 mt-4 space-y-3">
      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Ingredientes</p>
        <p className="text-sm text-foreground/80">{r.usedIngredients.join(", ")}</p>
      </div>
      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Pasos</p>
        <ul className="space-y-1.5">
          {r.steps.slice(0, 3).map((s, i) => (
            <li key={i} className="text-sm text-foreground/80 flex gap-2">
              <span className="text-primary/60 font-serif shrink-0">{i + 1}.</span>
              {s}
            </li>
          ))}
          {r.steps.length > 3 && (
            <li className="text-xs text-muted-foreground">+{r.steps.length - 3} pasos más...</li>
          )}
        </ul>
      </div>
      <div className="bg-primary/5 rounded-xl p-3 border border-primary/10">
        <p className="text-xs italic text-foreground/70 leading-relaxed">"{r.antiAnxietyTip}"</p>
      </div>
    </div>
  );
}

function MenuPreview({ entry }: { entry: Extract<SavedEntry, { type: "menu" }> }) {
  const firstDay = entry.data.days[0];
  if (!firstDay) return null;
  return (
    <div className="pt-4 border-t border-border/40 mt-4 space-y-2">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
        {entry.data.days.length > 1 ? `${entry.data.days.length} días` : "Un día"}
      </p>
      {[
        { label: "Desayuno", meal: firstDay.breakfast },
        { label: "Almuerzo", meal: firstDay.lunch },
        { label: "Cena", meal: firstDay.dinner },
      ].map(({ label, meal }) => (
        <div key={label} className="flex gap-3 text-sm">
          <span className="text-muted-foreground w-16 shrink-0">{label}</span>
          <span className="text-foreground/80">{meal.name}</span>
        </div>
      ))}
      {entry.data.days.length > 1 && (
        <p className="text-xs text-muted-foreground pt-1">y {entry.data.days.length - 1} día{entry.data.days.length > 2 ? "s" : ""} más...</p>
      )}
    </div>
  );
}

function PlannerPreview({ entry }: { entry: Extract<SavedEntry, { type: "planner" }> }) {
  const { shoppingList, weeklySavingsMessage } = entry.data;
  return (
    <div className="pt-4 border-t border-border/40 mt-4 space-y-3">
      <p className="text-sm text-foreground/80 italic">{weeklySavingsMessage}</p>
      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Lista de compras</p>
        {shoppingList.slice(0, 3).map((cat) => (
          <div key={cat.category} className="flex gap-2 text-sm mb-1">
            <span className="text-muted-foreground w-28 shrink-0">{cat.category}</span>
            <span className="text-foreground/80 truncate">{cat.items.slice(0, 3).join(", ")}{cat.items.length > 3 ? "..." : ""}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function EntryCard({
  entry,
  onToggleFavorite,
  onDelete,
}: {
  entry: SavedEntry;
  onToggleFavorite: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className="bg-card border border-border/60 rounded-2xl overflow-hidden shadow-sm"
    >
      <button className="w-full text-left px-5 pt-5 pb-4" onClick={() => setExpanded((v) => !v)}>
        <div className="flex items-start gap-3">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${typeColor(entry.type)}`}>
            {typeIcon(entry.type)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-xs font-medium text-muted-foreground">{typeLabel(entry.type)}</span>
              {entry.isFavorite && <Star size={11} className="text-primary fill-primary" />}
            </div>
            <p className="font-serif text-[17px] font-medium text-foreground leading-snug truncate">{entry.title}</p>
            <div className="flex items-center gap-1.5 mt-1.5 text-muted-foreground">
              <Clock size={11} />
              <span className="text-xs">{formatDate(entry.savedAt)}</span>
            </div>
          </div>
          <ChevronDown
            size={18}
            strokeWidth={1.5}
            className={`text-muted-foreground shrink-0 mt-1 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="preview"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden px-5"
          >
            {entry.type === "recipe" && <RecipePreview entry={entry} />}
            {entry.type === "menu" && <MenuPreview entry={entry} />}
            {entry.type === "planner" && <PlannerPreview entry={entry} />}
            <div className="h-4" />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="border-t border-border/40 flex">
        <button
          onClick={() => onToggleFavorite(entry.id)}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
            entry.isFavorite
              ? "text-primary bg-primary/5 hover:bg-primary/10"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
          }`}
        >
          <Star size={15} className={entry.isFavorite ? "fill-primary" : ""} />
          {entry.isFavorite ? "Favorita" : "Marcar favorita"}
        </button>
        <div className="w-px bg-border/40" />
        <button
          onClick={() => onDelete(entry.id)}
          className="flex items-center justify-center gap-2 px-5 py-3 text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors"
        >
          <Trash2 size={15} />
          Borrar
        </button>
      </div>
    </motion.div>
  );
}

export default function MyRecetario() {
  const [tab, setTab] = useState<Tab>("favoritos");
  const { entries, favorites, toggleFavorite, deleteEntry } = useRecetario();
  const { isPremium } = useAuth();

  const displayed = tab === "favoritos" ? favorites : entries;

  return (
    <Layout title="Mi Recetario">
      <div className="flex-1 flex flex-col p-6">
        {isPremium ? (
          <>
            <div className="flex gap-2 mb-6 bg-muted/40 rounded-xl p-1">
              {(["favoritos", "historial"] as Tab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all capitalize ${
                    tab === t
                      ? "bg-card shadow-sm text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t === "favoritos"
                    ? `Favoritos${favorites.length ? ` (${favorites.length})` : ""}`
                    : `Historial${entries.length ? ` (${entries.length})` : ""}`}
                </button>
              ))}
            </div>

            {displayed.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex-1 flex flex-col items-center justify-center text-center opacity-60 mt-8"
              >
                <BookHeart size={48} strokeWidth={1} className="mb-4 text-muted-foreground" />
                <p className="text-muted-foreground text-sm max-w-[220px]">
                  {tab === "favoritos"
                    ? "Todavía no tenés favoritos. Guardá una receta o menú con la estrella."
                    : "El historial está vacío. Generá recetas, menús o planners para verlos aquí."}
                </p>
              </motion.div>
            ) : (
              <div className="flex flex-col gap-3 pb-8">
                <AnimatePresence mode="popLayout">
                  {displayed.map((entry) => (
                    <EntryCard
                      key={entry.id}
                      entry={entry}
                      onToggleFavorite={toggleFavorite}
                      onDelete={deleteEntry}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </>
        ) : (
          <PremiumGate message="Favoritos e Historial son funciones Premium">
            <div className="space-y-4">
              <div className="flex gap-2 bg-muted/40 rounded-xl p-1">
                <div className="flex-1 py-2.5 rounded-lg text-sm font-medium text-center bg-card shadow-sm text-foreground">
                  Favoritos (3)
                </div>
                <div className="flex-1 py-2.5 rounded-lg text-sm font-medium text-center text-muted-foreground">
                  Historial (12)
                </div>
              </div>
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-card border border-border/60 rounded-2xl p-5 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-secondary/30 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted/50 rounded-lg w-3/4" />
                    <div className="h-3 bg-muted/30 rounded-lg w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          </PremiumGate>
        )}
      </div>
    </Layout>
  );
}
