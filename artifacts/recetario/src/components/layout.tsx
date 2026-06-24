import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { ChevronLeft, Clock, Crown, LogOut } from "lucide-react";
import { motion } from "framer-motion";
import { FeedbackDrawer } from "@/components/feedback-drawer";
import { useAuth } from "@/context/auth";

function TrialBanner() {
  const { subscription, trialDaysLeft } = useAuth();
  const [, setLocation] = useLocation();

  if (subscription?.subscription_status !== "trial" || trialDaysLeft === null) return null;
  if (trialDaysLeft > 3) return null;

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      className="bg-primary/10 border-b border-primary/20 px-4 py-2 flex items-center justify-between gap-2"
    >
      <div className="flex items-center gap-1.5 text-xs text-primary">
        <Clock size={12} />
        <span>
          {trialDaysLeft === 0
            ? "Tu prueba gratis vence hoy"
            : `${trialDaysLeft} día${trialDaysLeft !== 1 ? "s" : ""} de prueba restante${trialDaysLeft !== 1 ? "s" : ""}`}
        </span>
      </div>
      <button
        onClick={() => setLocation("/upgrade")}
        className="text-xs text-primary font-semibold underline-offset-2 underline shrink-0"
      >
        Actualizar
      </button>
    </motion.div>
  );
}

export function Layout({
  children,
  title,
  showBack = true,
}: {
  children: ReactNode;
  title?: string;
  showBack?: boolean;
}) {
  const [location] = useLocation();
  const { user, subscription, logout } = useAuth();
  const isHome = location === "/";

  const handleLogout = () => {
    logout();
    const base = import.meta.env.BASE_URL.replace(/\/$/, "");
    window.location.href = `${window.location.origin}${base}/login`;
  };

  return (
    <div className="min-h-[100dvh] w-full bg-background flex justify-center overflow-x-hidden font-sans text-foreground">
      <div className="w-full max-w-[480px] bg-card/30 min-h-[100dvh] flex flex-col relative shadow-sm border-x border-border/50">
        <TrialBanner />

        {isHome ? (
          user && (
            <div className="px-5 pt-5 pb-1 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {subscription?.subscription_status === "active" && (
                  <>
                    <Crown size={13} className="text-primary" />
                    <span className="text-xs font-semibold text-primary">Premium</span>
                  </>
                )}
                {subscription?.subscription_status === "trial" && (
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs text-muted-foreground">
                      Hola, {user.name.split(" ")[0]} · Prueba gratis
                    </span>
                    <span className="text-xs text-primary font-medium">
                      {trialDaysLeft === 0
                        ? "Tu prueba vence hoy"
                        : `Te quedan ${trialDaysLeft} día${trialDaysLeft !== 1 ? "s" : ""} de prueba gratis`}
                    </span>
                  </div>
                )}
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
              >
                <LogOut size={12} />
                Salir
              </button>
            </div>
          )
        ) : (
          showBack && (
            <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border/50 px-4 py-4 flex items-center gap-3">
              <Link
                href="/"
                className="p-2 -ml-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronLeft size={24} />
              </Link>
              {title && (
                <h1 className="font-serif text-lg font-medium tracking-tight text-foreground">
                  {title}
                </h1>
              )}
            </header>
          )
        )}

        <main className="flex-1 flex flex-col relative pb-20">{children}</main>
        <FeedbackDrawer />
      </div>
    </div>
  );
}
