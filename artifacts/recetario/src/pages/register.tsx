import { useState } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { Leaf, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/auth";
import type { User, Subscription } from "@/context/auth";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

const BENEFITS = [
  "Recetas con IA personalizadas al instante",
  "Menú anti ansiedad diario y semanal",
  "Planner familiar + lista de compras",
  "Sin publicidad, sin distracciones",
];

export default function Register() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const text = await res.text();
      let data: { token?: string; user?: User; subscription?: Subscription; error?: string } = {};
      try { data = JSON.parse(text); } catch { /* not JSON */ }
      if (!res.ok) {
        setError(data.error ?? `Error del servidor (${res.status}). Intentá de nuevo.`);
        return;
      }
      if (!data.token || !data.user || !data.subscription) {
        setError("Respuesta inesperada del servidor. Intentá de nuevo.");
        return;
      }
      login(data.token, data.user, data.subscription);
      localStorage.setItem("recetario_welcomed", "true");
      setLocation("/");
    } catch {
      setError("Error de conexión. Verificá tu internet e intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh bg-background flex items-center justify-center px-6 py-10">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-[360px]">
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Leaf className="w-5 h-5 text-primary" />
          </div>
          <h1 className="font-serif text-2xl text-foreground text-center">Comenzar prueba gratis</h1>
          <p className="text-sm text-muted-foreground mt-1 text-center">14 días gratis · Sin tarjeta de crédito</p>
        </div>

        <div className="bg-secondary/10 rounded-2xl p-4 mb-6 flex flex-col gap-2">
          {BENEFITS.map(b => (
            <div key={b} className="flex items-center gap-2 text-sm text-foreground/80">
              <CheckCircle2 size={14} className="text-secondary shrink-0" />
              {b}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <Input
            placeholder="Tu nombre"
            value={name}
            onChange={e => setName(e.target.value)}
            className="h-12 rounded-xl"
            required
          />
          <Input
            type="email"
            placeholder="tu@email.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="h-12 rounded-xl"
            required
          />
          <Input
            type="password"
            placeholder="Contraseña (mín. 6 caracteres)"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="h-12 rounded-xl"
            minLength={6}
            required
          />
          {error && <p className="text-destructive text-sm text-center">{error}</p>}
          <Button type="submit" disabled={loading || !name || !email || !password} className="h-12 rounded-xl mt-1">
            {loading ? <Loader2 size={16} className="animate-spin" /> : "Comenzar prueba gratis"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          ¿Ya tenés cuenta?{" "}
          <Link href="/login" className="text-primary font-medium hover:underline">
            Iniciá sesión
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
