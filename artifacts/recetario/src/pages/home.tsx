import { Layout } from "@/components/layout";
import { Link } from "wouter";
import { Utensils, CalendarDays, ShoppingBag, Sparkles, Lock, Zap, BookHeart, Crown, Target, Star, History, CheckCircle2 } from "lucide-react";
import { RecetarioLogo } from "@/components/logo";
import { motion } from "framer-motion";
import { useRecetario } from "@/hooks/use-recetario";
import { useAuth } from "@/context/auth";

const PREMIUM_FEATURES = [
  {
    icon: Target,
    label: "Recetas con objetivo personalizado",
    desc: "Rápida, económica, familiar, sin harinas y más",
  },
  {
    icon: Star,
    label: "Mis recetas favoritas",
    desc: "Guardá y accedé a tus recetas favoritas",
  },
  {
    icon: History,
    label: "Historial de recetas",
    desc: "Todas las recetas generadas en un solo lugar",
  },
  {
    icon: CalendarDays,
    label: "Planner semanal",
    desc: "Organizá lunes a domingo: desayuno, almuerzo y cena",
  },
  {
    icon: ShoppingBag,
    label: "Lista de compras automática",
    desc: "Ingredientes agrupados por categoría",
  },
];

export default function Home() {
  const { isPremium } = useAuth();
  const { favorites, entries } = useRecetario();

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.12 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } },
  };

  return (
    <Layout showBack={false}>
      <div className="flex-1 flex flex-col px-6 py-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mb-8 flex flex-col items-center"
        >
          <div className="relative mb-4">
            <RecetarioLogo size={72} />
            {isPremium && (
              <span className="absolute -top-1 -right-2 inline-flex items-center gap-1 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                <Crown size={9} strokeWidth={2.5} />
                Premium
              </span>
            )}
          </div>

          <h1 className="text-4xl font-serif font-medium text-foreground tracking-tight mb-3 text-center">
            Recetario de la Paz
          </h1>
          <p className="text-lg text-muted-foreground font-sans leading-relaxed max-w-[280px] text-center">
            Un espacio tranquilo para cocinar sin prisa y nutrirte con calma.
          </p>
        </motion.div>

        {/* Account status banner */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="mb-6"
        >
          {isPremium ? (
            <div className="rounded-2xl border border-primary/30 bg-primary/5 overflow-hidden shadow-sm">
              <div className="flex items-center gap-3 px-5 py-3 border-b bg-primary/10 border-primary/20">
                <Crown size={13} className="text-primary" strokeWidth={2.5} />
                <span className="text-sm font-semibold text-primary">Cuenta Premium activa</span>
              </div>
              <div className="px-5 py-4 flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/15 text-primary flex items-center justify-center shrink-0 mt-0.5">
                  <Zap size={18} strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground/80 leading-relaxed">
                    Tenés acceso completo: favoritos, historial, planner semanal y lista de compras automática.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm">
              <div className="flex items-center gap-3 px-5 py-3 border-b bg-secondary/20 border-border/40">
                <div className="w-2 h-2 rounded-full bg-muted-foreground/40" />
                <span className="text-sm font-medium text-foreground/70">Modo gratis activo</span>
              </div>
              <div className="px-5 py-4 flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles size={18} strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground/80 leading-relaxed mb-3">
                    Podés generar recetas y menús. Funciones Premium disponibles al actualizar.
                  </p>
                  <Link href="/premium">
                    <button className="inline-flex items-center gap-2 text-sm font-medium text-primary bg-primary/10 hover:bg-primary/15 transition-colors px-4 py-2 rounded-xl border border-primary/20">
                      <Lock size={14} strokeWidth={2} />
                      Ver funciones Premium
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </motion.div>

        {/* Module cards */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="flex flex-col gap-4"
        >
          {/* Recetas — available to all */}
          <motion.div variants={itemVariants}>
            <Link href="/recetas" className="block group">
              <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 hover:border-primary/30 flex gap-5 items-center">
                <div className="w-12 h-12 rounded-full bg-secondary/30 flex items-center justify-center text-secondary-foreground shrink-0 group-hover:scale-105 transition-transform">
                  <Utensils size={24} strokeWidth={1.5} />
                </div>
                <div className="flex-1">
                  <h2 className="font-serif text-xl font-medium text-foreground mb-1">¿Qué cocino hoy?</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Dinos qué ingredientes tenés y te sugerimos recetas reconfortantes.
                  </p>
                </div>
              </div>
            </Link>
          </motion.div>

          {/* Menú — available to all */}
          <motion.div variants={itemVariants}>
            <Link href="/menu" className="block group">
              <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 hover:border-primary/30 flex gap-5 items-center">
                <div className="w-12 h-12 rounded-full bg-accent/40 flex items-center justify-center text-accent-foreground shrink-0 group-hover:scale-105 transition-transform">
                  <CalendarDays size={24} strokeWidth={1.5} />
                </div>
                <div className="flex-1">
                  <h2 className="font-serif text-xl font-medium text-foreground mb-1">Menú Anti Ansiedad</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Menús diarios o semanales pensados para quitarte el estrés de decidir.
                  </p>
                </div>
              </div>
            </Link>
          </motion.div>

          {/* Planner — premium */}
          <motion.div variants={itemVariants}>
            <Link href="/planner" className="block group">
              <div className={`bg-card border rounded-2xl p-6 shadow-sm transition-all duration-300 flex gap-5 items-center ${isPremium ? "border-border/60 hover:shadow-md hover:border-primary/30" : "border-border/40 opacity-80"}`}>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 transition-transform ${isPremium ? "bg-primary/10 text-primary group-hover:scale-105" : "bg-muted/40 text-muted-foreground"}`}>
                  {isPremium ? <ShoppingBag size={24} strokeWidth={1.5} /> : <Lock size={22} strokeWidth={1.5} />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="font-serif text-xl font-medium text-foreground">Planner Familiar</h2>
                    {!isPremium && (
                      <span className="inline-flex items-center gap-1 text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold">
                        <Crown size={8} strokeWidth={2.5} />
                        Premium
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Organizá la semana entera y generá tu lista de compras automáticamente.
                  </p>
                </div>
              </div>
            </Link>
          </motion.div>

          {/* Mi Recetario — premium */}
          <motion.div variants={itemVariants}>
            <Link href="/mi-recetario" className="block group">
              <div className={`bg-card border rounded-2xl p-6 shadow-sm transition-all duration-300 flex gap-5 items-center ${isPremium ? "border-border/60 hover:shadow-md hover:border-primary/30" : "border-border/40 opacity-80"}`}>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 relative transition-transform ${isPremium ? "bg-primary/10 text-primary group-hover:scale-105" : "bg-muted/40 text-muted-foreground"}`}>
                  {isPremium ? (
                    <>
                      <BookHeart size={24} strokeWidth={1.5} />
                      {entries.length > 0 && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                          {entries.length > 9 ? "9+" : entries.length}
                        </span>
                      )}
                    </>
                  ) : (
                    <Lock size={22} strokeWidth={1.5} />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="font-serif text-xl font-medium text-foreground">Mi Recetario</h2>
                    {!isPremium && (
                      <span className="inline-flex items-center gap-1 text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold">
                        <Crown size={8} strokeWidth={2.5} />
                        Premium
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {isPremium && favorites.length > 0
                      ? `${favorites.length} favorito${favorites.length !== 1 ? "s" : ""} guardado${favorites.length !== 1 ? "s" : ""} · ${entries.length} en historial`
                      : "Tus recetas, menús y planners favoritos guardados."}
                  </p>
                </div>
              </div>
            </Link>
          </motion.div>
        </motion.div>

        {/* Premium features section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.5 }}
          className="mt-8"
        >
          <div className="rounded-2xl border overflow-hidden shadow-sm"
            style={{ borderColor: isPremium ? "hsl(var(--primary) / 0.25)" : "hsl(var(--border) / 0.6)" }}
          >
            {/* Header */}
            <div className={`flex items-center gap-3 px-5 py-3 border-b ${isPremium ? "bg-primary/8 border-primary/20" : "bg-muted/30 border-border/40"}`}>
              <Crown size={14} className={isPremium ? "text-primary" : "text-muted-foreground"} strokeWidth={2} />
              <span className={`text-sm font-semibold ${isPremium ? "text-primary" : "text-foreground/70"}`}>
                {isPremium ? "Funciones incluidas en tu plan" : "Funciones Premium"}
              </span>
            </div>

            {/* Feature list */}
            <div className="divide-y divide-border/30">
              {PREMIUM_FEATURES.map(({ icon: Icon, label, desc }) => (
                <div key={label} className="flex items-center gap-4 px-5 py-3.5">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isPremium ? "bg-primary/10 text-primary" : "bg-muted/40 text-muted-foreground"}`}>
                    {isPremium
                      ? <Icon size={16} strokeWidth={1.5} />
                      : <Lock size={14} strokeWidth={1.5} />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium leading-tight ${isPremium ? "text-foreground" : "text-foreground/60"}`}>{label}</p>
                    <p className="text-xs text-muted-foreground/80 mt-0.5 leading-snug">{desc}</p>
                  </div>
                  {isPremium ? (
                    <CheckCircle2 size={16} className="text-primary shrink-0" strokeWidth={1.5} />
                  ) : (
                    <span className="text-[10px] font-medium text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap">
                      Bloqueado
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* CTA for non-premium */}
            {!isPremium && (
              <div className="px-5 py-4 border-t border-border/40 bg-muted/10">
                <Link href="/premium">
                  <button className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground text-sm font-medium h-12 rounded-xl hover:bg-primary/90 transition-colors">
                    <Crown size={15} />
                    Desbloquear todas las funciones
                  </button>
                </Link>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </Layout>
  );
}
