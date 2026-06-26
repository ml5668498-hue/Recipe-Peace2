import { useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  Leaf,
  CheckCircle2,
  LogOut,
  Clock,
  Star,
  Lock,
  Crown,
  BookHeart,
  CalendarDays,
  ShoppingBag,
  Target,
  History,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth";

const FEATURES = [
  "Generador de recetas con IA personalizada",
  "Menú anti ansiedad diario y semanal",
  "Planner familiar + lista de compras",
  "Guardado de recetas personalizadas",
  "Sin publicidad",
];

const LOCKED_FEATURES = [
  { icon: Target, label: "Recetas con objetivo personalizado", desc: "Rápida, económica, familiar, sin harinas y más" },
  { icon: BookHeart, label: "Mis recetas favoritas", desc: "Guardá tus recetas y accedé cuando quieras" },
  { icon: History, label: "Historial de recetas", desc: "Todas tus generaciones en un solo lugar" },
  { icon: CalendarDays, label: "Planner semanal", desc: "Organizá lunes a domingo: desayuno, almuerzo y cena" },
  { icon: ShoppingBag, label: "Lista de compras automática", desc: "Ingredientes agrupados por categoría" },
];

export default function Subscribe() {
  const { user, subscription, trialDaysLeft, logout } = useAuth();
  const [, setLocation] = useLocation();

  const isExpired = subscription?.subscription_status === "expired";

  const handleLogout = () => {
    logout();
    setLocation("/login");
  };

  return (
    <div className="min-h-dvh bg-background flex flex-col items-center justify-start px-5 py-12">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="w-full max-w-[380px] flex flex-col gap-5"
      >
        {/* Header */}
        <div className="flex flex-col items-center">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Leaf className="w-6 h-6 text-primary" />
          </div>

          {isExpired ? (
            <>
              <h1 className="font-serif text-2xl text-foreground text-center">
                Tu prueba gratis terminó
              </h1>
              <p className="text-sm text-muted-foreground mt-2 text-center max-w-[280px]">
                Activá Premium para seguir cocinando con calma sin interrupciones.
              </p>
            </>
          ) : (
            <>
              <h1 className="font-serif text-2xl text-foreground text-center">
                Plan Premium
              </h1>
              {user && trialDaysLeft !== null && (
                <div className="flex items-center gap-1.5 mt-2 text-sm text-primary">
                  <Clock size={13} />
                  <span>
                    {trialDaysLeft === 0
                      ? "Tu prueba vence hoy"
                      : `${trialDaysLeft} día${trialDaysLeft !== 1 ? "s" : ""} de prueba restante${trialDaysLeft !== 1 ? "s" : ""}`}
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Retention message */}
        <div className="bg-accent/30 border border-accent/50 rounded-2xl px-5 py-4 flex items-start gap-3">
          <Sparkles size={18} className="text-accent-foreground shrink-0 mt-0.5" strokeWidth={1.5} />
          <p className="text-[14px] text-foreground/80 leading-relaxed">
            Conservá tus recetas, favoritos y planner al activar Premium
          </p>
        </div>

        {/* Price card */}
        <div className="bg-card border border-border/60 rounded-3xl p-6 shadow-sm">
          {/* Offer badge */}
          <div className="inline-flex items-center gap-1.5 bg-primary/10 border border-primary/20 text-primary text-[11px] font-semibold px-3 py-1 rounded-full mb-4 uppercase tracking-wider">
            <Star size={9} fill="currentColor" />
            Oferta de lanzamiento
          </div>

          {/* Price row */}
          <div className="flex items-baseline gap-3 mb-5">
            <div>
              <span className="font-serif text-4xl text-foreground font-medium">$4.990</span>
              <span className="text-sm text-muted-foreground ml-2">ARS / mes</span>
            </div>
            <span className="text-lg text-muted-foreground/60 line-through font-serif">$9.990</span>
          </div>

          <div className="flex flex-col gap-2.5">
            {FEATURES.map((f) => (
              <div key={f} className="flex items-center gap-2 text-sm text-foreground/80">
                <CheckCircle2 size={14} className="text-secondary shrink-0" />
                {f}
              </div>
            ))}
          </div>
        </div>

        {/* Coming soon state */}
        <div className="bg-muted/60 rounded-2xl p-4 text-center">
          <p className="text-sm text-muted-foreground leading-relaxed">
            <span className="font-medium text-foreground">Pagos próximamente.</span>
            {" "}Estamos integrando Mercado Pago. Te avisaremos cuando esté disponible.
          </p>
        </div>

        {isExpired ? (
          <Button disabled className="w-full h-12 rounded-xl">
            Activar Premium
          </Button>
        ) : (
          <Button disabled className="w-full h-12 rounded-xl opacity-50 cursor-not-allowed">
            Suscribirme con Mercado Pago — Próximamente
          </Button>
        )}

        {/* Locked features — shown to trial users */}
        {!isExpired && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.35 }}
            className="bg-card border border-border/60 rounded-2xl overflow-hidden shadow-sm"
          >
            <div className="flex items-center gap-2 px-5 py-3 border-b border-border/40 bg-muted/30">
              <Crown size={13} className="text-primary" strokeWidth={2} />
              <span className="text-sm font-semibold text-foreground/80">Funciones que desbloquearías</span>
            </div>

            <div className="divide-y divide-border/30">
              {LOCKED_FEATURES.map(({ icon: Icon, label, desc }) => (
                <div key={label} className="flex items-center gap-4 px-5 py-3.5">
                  <div className="w-8 h-8 rounded-full bg-muted/50 text-muted-foreground flex items-center justify-center shrink-0">
                    <Lock size={13} strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground/70 leading-tight">{label}</p>
                    <p className="text-xs text-muted-foreground/80 mt-0.5 leading-snug">{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="px-5 py-4 border-t border-border/40 bg-primary/3">
              <Button
                disabled
                className="w-full h-11 rounded-xl text-sm font-semibold bg-primary text-primary-foreground opacity-60 cursor-not-allowed"
              >
                <Lock size={14} className="mr-2" />
                Desbloquear Premium — Próximamente
              </Button>
            </div>
          </motion.div>
        )}

        <button
          onClick={handleLogout}
          className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors py-1"
        >
          <LogOut size={13} />
          Cerrar sesión
        </button>
      </motion.div>
    </div>
  );
}
