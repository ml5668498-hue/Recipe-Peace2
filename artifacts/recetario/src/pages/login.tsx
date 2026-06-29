import { useState } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { Leaf, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/auth";
import type { User, Subscription } from "@/context/auth";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

export default function Login() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
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
      setLocation("/");
    } catch {
      setError("Error de conexión. Verificá tu internet e intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh bg-background flex items-center justify-center px-6">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-[360px]">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Leaf className="w-5 h-5 text-primary" />
          </div>
          <h1 className="font-serif text-2xl text-foreground">Bienvenida de vuelta</h1>
          <p className="text-sm text-muted-foreground mt-1">Iniciá sesión para continuar</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
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
            placeholder="Contraseña"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="h-12 rounded-xl"
            required
          />
          {error && <p className="text-destructive text-sm text-center">{error}</p>}
          <Button type="submit" disabled={loading || !email || !password} className="h-12 rounded-xl mt-1">
            {loading ? <Loader2 size={16} className="animate-spin" /> : "Iniciar sesión"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          ¿No tenés cuenta?{" "}
          <Link href="/register" className="text-primary font-medium hover:underline">
            Registrate gratis
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
