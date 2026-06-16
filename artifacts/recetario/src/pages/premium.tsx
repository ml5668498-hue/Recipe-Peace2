import { useState } from "react";
import { Layout } from "@/components/layout";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  ChefHat,
  CalendarDays,
  ShoppingBag,
  PiggyBank,
  Target,
  CheckCircle2,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [joined, setJoined] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; email?: string; server?: string }>({});

  const validate = () => {
    const next: { name?: string; email?: string } = {};
    if (!name.trim()) next.name = "Ingresá tu nombre.";
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      next.email = "Ingresá un email válido.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleJoin = async () => {
    if (!validate()) return;
    setLoading(true);
    setErrors({});

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim().toLowerCase() }),
      });

      if (res.ok) {
        setJoined(true);
      } else {
        const body = await res.json().catch(() => ({}));
        setErrors({ server: body.error ?? "Error al registrarse. Intenta de nuevo." });
      }
    } catch {
      setErrors({ server: "Error de conexión. Intenta de nuevo." });
    } finally {
      setLoading(false);
    }
  };

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
            Próximamente disponible
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
                className="bg-card border border-border/60 rounded-2xl p-4 flex gap-4 items-start shadow-sm"
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

          {/* Waitlist section */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.4 }}
            className="bg-card border border-border/60 rounded-2xl p-6 shadow-sm"
          >
            <AnimatePresence mode="wait">
              {joined ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center text-center py-6 gap-4"
                >
                  <div className="w-16 h-16 bg-secondary/30 rounded-full flex items-center justify-center text-secondary-foreground">
                    <CheckCircle2 size={30} strokeWidth={1.5} />
                  </div>
                  <div>
                    <p className="font-serif text-xl font-medium text-foreground mb-2">
                      ¡Estás en la lista!
                    </p>
                    <p className="text-sm text-muted-foreground leading-relaxed max-w-[230px]">
                      Te avisaremos cuando Premium esté disponible.
                    </p>
                  </div>
                </motion.div>
              ) : (
                <motion.div key="form" exit={{ opacity: 0 }}>
                  <div className="flex items-center gap-3 mb-5">
                    <Mail size={20} className="text-primary shrink-0" strokeWidth={1.5} />
                    <div>
                      <p className="font-serif text-[17px] font-medium text-foreground leading-snug">
                        Unirme a Premium
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Te avisamos cuando esté disponible.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    {/* Name */}
                    <div>
                      <Input
                        type="text"
                        placeholder="Tu nombre"
                        value={name}
                        onChange={(e) => {
                          setName(e.target.value);
                          setErrors((prev) => ({ ...prev, name: undefined }));
                        }}
                        onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                        className={`h-12 rounded-xl border-border/60 bg-background focus-visible:ring-primary/50 text-base ${errors.name ? "border-destructive/60" : ""}`}
                      />
                      {errors.name && (
                        <p className="text-xs text-destructive mt-1.5 px-1">{errors.name}</p>
                      )}
                    </div>

                    {/* Email */}
                    <div>
                      <Input
                        type="email"
                        placeholder="tu@email.com"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          setErrors((prev) => ({ ...prev, email: undefined }));
                        }}
                        onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                        className={`h-12 rounded-xl border-border/60 bg-background focus-visible:ring-primary/50 text-base ${errors.email ? "border-destructive/60" : ""}`}
                      />
                      {errors.email && (
                        <p className="text-xs text-destructive mt-1.5 px-1">{errors.email}</p>
                      )}
                    </div>

                    {errors.server && (
                      <p className="text-xs text-destructive px-1">{errors.server}</p>
                    )}

                    <Button
                      onClick={handleJoin}
                      disabled={loading}
                      className="w-full h-12 rounded-xl text-[16px] font-medium bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm mt-1"
                    >
                      {loading ? "Guardando..." : "Unirme a Premium"}
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </Layout>
  );
}
