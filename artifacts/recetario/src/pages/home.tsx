import { Layout } from "@/components/layout";
import { Link } from "wouter";
import { Utensils, CalendarDays, ShoppingBag, Sparkles, Lock, Zap, BookHeart } from "lucide-react";
import { RecetarioLogo } from "@/components/logo";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useRecetario } from "@/hooks/use-recetario";

async function fetchPlanMode(): Promise<{ mode: "free" | "premium" }> {
  const res = await fetch("/api/plan");
  if (!res.ok) return { mode: "free" };
  return res.json();
}

export default function Home() {
  const { data: plan } = useQuery({
    queryKey: ["plan-mode"],
    queryFn: fetchPlanMode,
    staleTime: 60_000,
  });

  const { favorites, entries } = useRecetario();
  const isPremium = plan?.mode === "premium";

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.12 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
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
          {/* Premium badge — top right of icon */}
          <div className="relative mb-4">
            <RecetarioLogo size={72} />
            <Link href="/premium">
              <span className="absolute -top-1 -right-2 inline-flex items-center gap-1 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full cursor-pointer hover:bg-primary/90 transition-colors shadow-sm">
                <Sparkles size={9} strokeWidth={2.5} />
                Premium
              </span>
            </Link>
          </div>

          <h1 className="text-4xl font-serif font-medium text-foreground tracking-tight mb-3 text-center">
            Recetario de la Paz
          </h1>
          <p className="text-lg text-muted-foreground font-sans leading-relaxed max-w-[280px] text-center">
            Un espacio tranquilo para cocinar sin prisa y nutrirte con calma.
          </p>
        </motion.div>

        {/* Plan mode banner */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className={`mb-6 rounded-2xl border overflow-hidden shadow-sm ${
            isPremium ? "border-primary/30 bg-primary/5" : "border-border/60 bg-card"
          }`}
        >
          <div
            className={`flex items-center gap-3 px-5 py-3 border-b ${
              isPremium ? "bg-primary/10 border-primary/20" : "bg-secondary/20 border-border/40"
            }`}
          >
            <div className={`w-2 h-2 rounded-full ${isPremium ? "bg-primary" : "bg-muted-foreground/40"}`} />
            <span className="text-sm font-medium text-foreground/70">
              {isPremium ? "IA personalizada activa" : "Modo gratis activo"}
            </span>
          </div>
          <div className="px-5 py-4 flex items-start gap-4">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                isPremium ? "bg-primary/15 text-primary" : "bg-primary/10 text-primary"
              }`}
            >
              {isPremium ? <Zap size={18} strokeWidth={1.5} /> : <Sparkles size={18} strokeWidth={1.5} />}
            </div>
            <div className="flex-1 min-w-0">
              {isPremium ? (
                <p className="text-sm text-foreground/80 leading-relaxed">
                  Groq IA genera recetas, menús y planners personalizados para vos en segundos.
                </p>
              ) : (
                <>
                  <p className="text-sm text-foreground/80 leading-relaxed mb-3">
                    Estás usando recetas de nuestra base interna. Con IA personalizada, las recetas y menús se crean especialmente para vos.
                  </p>
                  <Link href="/premium">
                    <button className="inline-flex items-center gap-2 text-sm font-medium text-primary bg-primary/10 hover:bg-primary/15 transition-colors px-4 py-2 rounded-xl border border-primary/20">
                      <Lock size={14} strokeWidth={2} />
                      Desbloquear IA personalizada
                    </button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </motion.div>

        {/* Module cards */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="flex flex-col gap-4"
        >
          <motion.div variants={itemVariants}>
            <Link href="/recetas" className="block group">
              <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 hover:border-primary/30 flex gap-5 items-center">
                <div className="w-12 h-12 rounded-full bg-secondary/30 flex items-center justify-center text-secondary-foreground shrink-0 group-hover:scale-105 transition-transform">
                  <Utensils size={24} strokeWidth={1.5} />
                </div>
                <div>
                  <h2 className="font-serif text-xl font-medium text-foreground mb-1">¿Qué cocino hoy?</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Dinos qué ingredientes tienes y te sugerimos recetas fáciles y reconfortantes.
                  </p>
                </div>
              </div>
            </Link>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Link href="/menu" className="block group">
              <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 hover:border-primary/30 flex gap-5 items-center">
                <div className="w-12 h-12 rounded-full bg-accent/40 flex items-center justify-center text-accent-foreground shrink-0 group-hover:scale-105 transition-transform">
                  <CalendarDays size={24} strokeWidth={1.5} />
                </div>
                <div>
                  <h2 className="font-serif text-xl font-medium text-foreground mb-1">Menú Anti Ansiedad</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Menús diarios o semanales pensados para quitarte el estrés de decidir.
                  </p>
                </div>
              </div>
            </Link>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Link href="/planner" className="block group">
              <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 hover:border-primary/30 flex gap-5 items-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0 group-hover:scale-105 transition-transform">
                  <ShoppingBag size={24} strokeWidth={1.5} />
                </div>
                <div>
                  <h2 className="font-serif text-xl font-medium text-foreground mb-1">Planner Familiar</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Organiza la semana entera, ahorra dinero y lleva una lista de compras clara.
                  </p>
                </div>
              </div>
            </Link>
          </motion.div>

          {/* Mi Recetario */}
          <motion.div variants={itemVariants}>
            <Link href="/mi-recetario" className="block group">
              <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 hover:border-primary/30 flex gap-5 items-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0 group-hover:scale-105 transition-transform relative">
                  <BookHeart size={24} strokeWidth={1.5} />
                  {entries.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                      {entries.length > 9 ? "9+" : entries.length}
                    </span>
                  )}
                </div>
                <div>
                  <h2 className="font-serif text-xl font-medium text-foreground mb-1">Mi Recetario</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {favorites.length > 0
                      ? `${favorites.length} favorito${favorites.length !== 1 ? "s" : ""} guardado${favorites.length !== 1 ? "s" : ""} · ${entries.length} en historial`
                      : "Tus recetas, menús y planners favoritos guardados."}
                  </p>
                </div>
              </div>
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </Layout>
  );
}
