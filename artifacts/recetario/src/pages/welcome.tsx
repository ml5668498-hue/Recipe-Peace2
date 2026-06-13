import { motion } from "framer-motion";
import { Heart, ChefHat, CalendarDays, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";

const benefits = [
  {
    icon: <ChefHat size={22} strokeWidth={1.5} />,
    title: "Recetas con lo que tienes",
    desc: "Ingresa tus ingredientes y recibe recetas reconfortantes al instante.",
    bg: "bg-secondary/30 text-secondary-foreground",
  },
  {
    icon: <CalendarDays size={22} strokeWidth={1.5} />,
    title: "Menú anti ansiedad",
    desc: "Un menú diario o semanal que elimina la carga de decidir qué comer.",
    bg: "bg-accent/40 text-accent-foreground",
  },
  {
    icon: <ShoppingBag size={22} strokeWidth={1.5} />,
    title: "Planner familiar saludable",
    desc: "Organiza la semana, genera la lista de compras y ahorra dinero.",
    bg: "bg-primary/10 text-primary",
  },
];

export default function Welcome({ onDone }: { onDone: () => void }) {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-between px-6 py-12 max-w-md mx-auto">
      {/* Top: logo + headline */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="flex flex-col items-center text-center"
      >
        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6 text-primary">
          <Heart size={40} strokeWidth={1.5} />
        </div>

        <h1 className="text-4xl font-serif font-medium text-foreground tracking-tight mb-4 leading-tight">
          Recetario<br />de la Paz
        </h1>

        <p className="text-lg text-muted-foreground leading-relaxed max-w-[280px]">
          Cocina con calma, organiza tus comidas y ahorra sin estrés.
        </p>
      </motion.div>

      {/* Middle: benefit cards */}
      <motion.div
        initial="hidden"
        animate="show"
        variants={{
          hidden: {},
          show: { transition: { staggerChildren: 0.14, delayChildren: 0.35 } },
        }}
        className="w-full flex flex-col gap-4 my-10"
      >
        {benefits.map((b) => (
          <motion.div
            key={b.title}
            variants={{
              hidden: { opacity: 0, x: -16 },
              show: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 260, damping: 22 } },
            }}
            className="bg-card border border-border/60 rounded-2xl p-5 flex gap-4 items-start shadow-sm"
          >
            <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${b.bg}`}>
              {b.icon}
            </div>
            <div>
              <p className="font-serif text-[17px] font-medium text-foreground mb-1 leading-snug">{b.title}</p>
              <p className="text-sm text-muted-foreground leading-relaxed">{b.desc}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Bottom: CTA */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9, duration: 0.45, ease: "easeOut" }}
        className="w-full"
      >
        <Button
          onClick={onDone}
          className="w-full h-14 rounded-xl text-[17px] font-medium bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
        >
          Empezar ahora
        </Button>
        <p className="text-center text-xs text-muted-foreground mt-4">
          Sin registrarse · Gratis para siempre
        </p>
      </motion.div>
    </div>
  );
}
