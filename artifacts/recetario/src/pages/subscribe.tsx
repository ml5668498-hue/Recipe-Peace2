import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Leaf, CheckCircle2, LogOut, Clock, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth";

const FEATURES = [
  "Generador de recetas con IA personalizada",
  "Menú anti ansiedad diario y semanal",
  "Planner familiar + lista de compras",
  "Guardado de recetas personalizadas",
  "Sin publicidad",
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
    <div className="min-h-dvh bg-background flex items-center justify-center px-5 py-12">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="w-full max-w-[380px]"
      >
        {/* Header */}
        <div className="flex flex-col items-center mb-7">
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

        {/* Price card */}
        <div className="bg-card border border-border/60 rounded-3xl p-6 mb-5 shadow-sm">
          <div className="flex items-baseline justify-between mb-5">
            <div>
              <span className="font-serif text-4xl text-foreground font-medium">$4.990</span>
              <span className="text-sm text-muted-foreground ml-2">ARS / mes</span>
            </div>
            <span className="text-xs font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-full flex items-center gap-1">
              <Star size={10} fill="currentColor" />
              Premium
            </span>
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
        <div className="bg-muted/60 rounded-2xl p-4 mb-4 text-center">
          <p className="text-sm text-muted-foreground leading-relaxed">
            <span className="font-medium text-foreground">Pagos próximamente.</span>
            {" "}Estamos integrando Mercado Pago. Te avisaremos cuando esté disponible.
          </p>
        </div>

        {isExpired ? (
          <Button disabled className="w-full h-12 rounded-xl mb-4">
            Activar Premium
          </Button>
        ) : (
          <Button disabled className="w-full h-12 rounded-xl opacity-50 cursor-not-allowed mb-4">
            Suscribirme con Mercado Pago — Próximamente
          </Button>
        )}

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors py-1"
        >
          <LogOut size={13} />
          Cerrar sesión
        </button>
      </motion.div>
    </div>
  );
}
