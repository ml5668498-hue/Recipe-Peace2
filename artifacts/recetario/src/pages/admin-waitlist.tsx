import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Users, Mail, Clock, RefreshCw, Loader2, Download, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface WaitlistEntry {
  id: string;
  name: string;
  email: string;
  created_at: string;
}

export default function AdminWaitlist() {
  const [key, setKey] = useState(() => sessionStorage.getItem("admin_key") ?? "");
  const [keyInput, setKeyInput] = useState("");
  const [authError, setAuthError] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  };

  const fetchEntries = async (adminKey: string) => {
    setLoading(true);
    setError(null);
    try {
      const url = adminKey ? `/api/waitlist?key=${encodeURIComponent(adminKey)}` : "/api/waitlist";
      const res = await fetch(url);
      if (res.status === 401) {
        setAuthenticated(false);
        setAuthError(true);
        sessionStorage.removeItem("admin_key");
        setKey("");
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Error ${res.status}`);
      }
      const data = await res.json();
      setEntries(data.entries ?? []);
      setTotal(data.total ?? 0);
      setAuthenticated(true);
      setAuthError(false);
      sessionStorage.setItem("admin_key", adminKey);
    } catch (err) {
      if (!authError) {
        setError(err instanceof Error ? err.message : "Error al cargar");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(false);
    await fetchEntries(keyInput);
    if (!authError) setKey(keyInput);
  };

  useEffect(() => {
    if (key) {
      fetchEntries(key);
    }
  }, []);

  const exportCSV = () => {
    const header = "Nombre,Email,Fecha";
    const rows = entries.map(e =>
      `"${e.name.replace(/"/g, '""')}","${e.email.replace(/"/g, '""')}","${formatDate(e.created_at)}"`
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `waitlist-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!authenticated) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-[340px]"
        >
          <div className="flex flex-col items-center mb-8">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Lock size={22} className="text-primary" />
            </div>
            <h1 className="font-serif text-2xl text-foreground">Panel Admin</h1>
            <p className="text-sm text-muted-foreground mt-1">Ingresá tu clave de acceso</p>
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-3">
            <Input
              type="password"
              placeholder="Clave secreta"
              value={keyInput}
              onChange={e => { setKeyInput(e.target.value); setAuthError(false); }}
              className="h-12 rounded-xl text-center tracking-widest"
              autoFocus
            />
            {authError && (
              <p className="text-destructive text-sm text-center">Acceso no autorizado.</p>
            )}
            <Button
              type="submit"
              disabled={loading || !keyInput}
              className="h-12 rounded-xl"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : "Ingresar"}
            </Button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background">
      <div className="max-w-[700px] mx-auto px-6 py-10">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users size={20} className="text-primary" />
            </div>
            <h1 className="font-serif text-2xl text-foreground">Panel Waitlist</h1>
          </div>
          <p className="text-muted-foreground text-sm">Emails capturados en los formularios de registro Premium.</p>
        </div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 gap-4 mb-6"
        >
          <div className="bg-card border border-border/60 rounded-2xl p-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Total registros</p>
            <p className="font-serif text-4xl text-foreground">{loading ? "—" : total}</p>
          </div>
          <div className="bg-card border border-border/60 rounded-2xl p-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Último registro</p>
            <p className="text-sm text-foreground/80 mt-1 leading-snug">
              {loading ? "—" : entries.length > 0 ? formatDate(entries[0].created_at) : "Sin registros"}
            </p>
          </div>
        </motion.div>

        {/* Actions */}
        <div className="flex justify-end gap-2 mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={exportCSV}
            disabled={loading || entries.length === 0}
            className="rounded-xl border-border/60 gap-2"
          >
            <Download size={14} />
            Exportar CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchEntries(key)}
            disabled={loading}
            className="rounded-xl border-border/60 gap-2"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            Actualizar
          </Button>
        </div>

        {/* Content */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-primary/50" />
          </div>
        )}

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-2xl p-5 text-destructive text-sm">
            {error}
          </div>
        )}

        {!loading && !error && entries.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center opacity-60">
            <Mail size={40} strokeWidth={1} className="mb-3 text-muted-foreground" />
            <p className="text-muted-foreground text-sm">No hay registros todavía.</p>
          </div>
        )}

        {!loading && !error && entries.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-3">
            {entries.map((entry, i) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="bg-card border border-border/60 rounded-xl px-5 py-4 flex items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <p className="font-medium text-foreground text-[15px] truncate">{entry.name || "—"}</p>
                  <p className="text-sm text-muted-foreground truncate">{entry.email}</p>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
                  <Clock size={11} />
                  {formatDate(entry.created_at)}
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
