import { Layout } from "@/components/layout";
import { motion } from "framer-motion";
import {
  Sparkles,
  ChefHat,
  CalendarDays,
  ShoppingBag,
  PiggyBank,
  Target,
  MessageCircle,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const WHATSAPP_URL =
  "https://wa.me/549344618166?text=" +
  encodeURIComponent("Hola! Quiero activar mi cuenta Premium de Recetario de la Paz 🙌");

const benefits = [
  {
    icon: <ChefHat size={20} strokeWidth={1.5} />,
    title: "Recetas ilimitadas con IA",
    desc: "Generá todas las recetas que quieras, adaptadas a tus gustos y restricciones.",
    bg: "bg-secondary/30 text-secondary-foreground",
  },
  {
    icon: <CalendarDays size={20} strokeWidth={1.5} />,
    title: "Menú personalizado",
    desc: "Menús diarios y semanales 100% a medida, sin repetir y según tu estilo de vida.",
    bg: "bg-accent/40 text-accent-foreground",
  },
  {
    icon: <ShoppingBag size={20} strokeWidth={1.5} />,
    title: "Planner avanzado",
    desc: "Planner semanal con porciones, calorías y lista de compras optimizada.",
    bg: "bg-primary/10 text-primary",
  },
  {
    icon: <PiggyBank size={20} strokeWidth={1.5} />,
    title: "Ahorro mensual",
    desc: "Estimación personalizada de cuánto podés ahorrar planificando tus comidas.",
    bg: "bg-secondary/30 text-secondary-foreground",
  },
  {
    icon: <Target size={20} strokeWidth={1.5} />,
    title: "Recetas por objetivos",
    desc: "Comidas adaptadas a tus metas: bajar peso, más energía, menos estrés, más músculo.",
    bg: "bg-accent/40 text-accent-foreground",
  },
];

export default function Premium() {
  return (
    <Layout title="Premium">
      <div className="flex-1 flex flex-col pb-10">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-gradient-to-b from-primary/8 to-transparent px-6 pt-8 pb-10 text-center flex flex-col items-center"
        >
          <div className="w-16 h-16 bg-primary/15 rounded-full flex items-center justify-center mb-5 text-primary">
            <Sparkles size={30} strokeWidth={1.5} />
          </div>

          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary text-xs font-semibold px-3 py-1.5 rounded-full mb-5 uppercase tracking-wider">
            Activación inmediata
          </div>

          <h2 className="font-serif text-3xl font-medium text-foreground tracking-tight mb-3 leading-tight">
            Recetario de la Paz<br />Premium
          </h2>
          <p className="text-muted-foreground text-[15px] leading-relaxed max-w-[260px]">
            Todo lo que necesitás para cocinar con calma, ahorrar y cuidar a tu familia.
          </p>
        </motion.div>

        {/* Benefits */}
        <div className="px-6">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            Qué incluye
          </p>

          <motion.div
            initial="hidden"
            animate="show"
            variants={{
              hidden: {},
              show: { transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
            }}
            className="flex flex-col gap-3 mb-8"
          >
            {benefits.map((b) => (
              <motion.div
                key={b.title}
                variants={{
                  hidden: { opacity: 0, x: -12 },
                  show: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 280, damping: 24 } },
                }}
                className="w-full bg-card border border-border/60 rounded-2xl p-4 flex gap-4 items-start shadow-sm"
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${b.bg}`}>
                  {b.icon}
                </div>
                <div>
                  <p className="font-serif text-[16px] font-medium text-foreground mb-0.5 leading-snug">{b.title}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{b.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Price */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55, duration: 0.4 }}
            className="bg-card border border-border/60 rounded-2xl p-6 shadow-sm mb-4"
          >
            <div className="inline-flex items-center gap-1.5 bg-primary/10 border border-primary/20 text-primary text-[11px] font-semibold px-3 py-1 rounded-full mb-4 uppercase tracking-wider">
              <Star size={9} fill="currentColor" />
              Oferta de lanzamiento
            </div>
            <div className="flex items-baseline gap-3">
              <div>
                <span className="font-serif text-4xl text-foreground font-medium">$4.990</span>
                <span className="text-sm text-muted-foreground ml-2">ARS / mes</span>
              </div>
              <span className="text-lg text-muted-foreground/60 line-through font-serif">$9.990</span>
            </div>
          </motion.div>

          {/* WhatsApp activation */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.4 }}
            className="bg-card border border-border/60 rounded-2xl p-6 shadow-sm"
          >
            <div className="flex items-center gap-3 mb-5">
              <MessageCircle size={20} className="text-primary shrink-0" strokeWidth={1.5} />
              <div>
                <p className="font-serif text-[17px] font-medium text-foreground leading-snug">
                  Activá tu Premium hoy
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Escribinos por WhatsApp y te activamos el acceso al instante.
                </p>
              </div>
            </div>

            <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="block">
              <Button className="w-full h-12 rounded-xl text-[16px] font-medium bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm">
                Escribir por WhatsApp
              </Button>
            </a>
          </motion.div>
        </div>
      </div>
    </Layout>
  );
}
