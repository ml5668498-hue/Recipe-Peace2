import { type ReactNode } from "react";
import { Link } from "wouter";
import { Lock, Crown } from "lucide-react";
import { useAuth } from "@/context/auth";

export function PremiumGate({
  children,
  message = "Esta función está disponible en Premium",
  compact = false,
}: {
  children: ReactNode;
  message?: string;
  compact?: boolean;
}) {
  const { isPremium } = useAuth();
  if (isPremium) return <>{children}</>;

  return (
    <div className="relative rounded-2xl overflow-hidden">
      <div className="pointer-events-none select-none opacity-30 blur-[3px]">
        {children}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-card/70 backdrop-blur-[2px]">
        <div className={`flex flex-col items-center gap-3 px-6 text-center ${compact ? "py-4" : "py-8"}`}>
          <div className={`rounded-full bg-primary/10 flex items-center justify-center ${compact ? "w-10 h-10" : "w-14 h-14"}`}>
            <Lock size={compact ? 18 : 24} className="text-primary" strokeWidth={1.5} />
          </div>
          <div>
            <p className={`font-medium text-foreground ${compact ? "text-sm" : "text-base"}`}>{message}</p>
            <p className="text-xs text-muted-foreground mt-1">Disponible en Premium</p>
          </div>
          <Link href="/premium">
            <button className={`flex items-center gap-2 bg-primary text-primary-foreground font-medium rounded-xl hover:bg-primary/90 transition-colors ${compact ? "text-xs px-4 py-2" : "text-sm px-6 py-3"}`}>
              <Crown size={compact ? 12 : 15} />
              Ver plan Premium
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
