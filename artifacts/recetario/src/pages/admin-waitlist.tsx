import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Users, Mail, Clock, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WaitlistEntry {
  id: string;
  name: string;
  email: string;
  created_at: string;
}

export default function AdminWaitlist() {
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEntries = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/waitlist");
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Error ${res.status}`);
      }
      const data = await res.json();
      setEntries(data.entries ?? []);
      setTotal(data.total ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, []);

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

        {/* Refresh button */}
        <div className="flex justify-end mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchEntries}
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
