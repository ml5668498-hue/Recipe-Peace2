import { Layout } from "@/components/layout";
import { Link } from "wouter";
import { Utensils, CalendarDays, ShoppingBag, Heart } from "lucide-react";
import { motion } from "framer-motion";

export default function Home() {
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.15 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <Layout showBack={false}>
      <div className="flex-1 flex flex-col px-6 py-12">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mb-10 text-center flex flex-col items-center"
        >
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4 text-primary">
            <Heart size={32} strokeWidth={1.5} />
          </div>
          <h1 className="text-4xl font-serif font-medium text-foreground tracking-tight mb-3">
            Recetario de la Paz
          </h1>
          <p className="text-lg text-muted-foreground font-sans leading-relaxed max-w-[280px]">
            Un espacio tranquilo para cocinar sin prisa y nutrirte con calma.
          </p>
        </motion.div>

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
        </motion.div>
      </div>
    </Layout>
  );
}
