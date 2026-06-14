import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, MessageSquarePlus, CheckCircle2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

// ── Storage ───────────────────────────────────────────────────────

const STORAGE_KEY = "recetario_feedback";

interface FeedbackEntry {
  id: string;
  submittedAt: number;
  useful: boolean | null;
  improvement: string;
  wouldUseAgain: "si" | "no" | "tal_vez" | null;
  wouldPayPremium: "si" | "no" | "tal_vez" | null;
}

function saveFeedback(entry: FeedbackEntry) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const existing: FeedbackEntry[] = raw ? JSON.parse(raw) : [];
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...existing, entry]));
  } catch {
    // ignore
  }
}

// ── Small helpers ─────────────────────────────────────────────────

type YesNoMaybe = "si" | "no" | "tal_vez";

function PillGroup({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string | null;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex gap-2 flex-wrap">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
            value === o.value
              ? "bg-primary text-primary-foreground border-primary shadow-sm"
              : "bg-card text-foreground/70 border-border/60 hover:border-primary/40 hover:text-foreground"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

const YES_NO = [
  { value: "si", label: "Sí" },
  { value: "no", label: "No" },
];

const YES_NO_MAYBE = [
  { value: "si", label: "Sí" },
  { value: "tal_vez", label: "Tal vez" },
  { value: "no", label: "No" },
];

// ── Main component ────────────────────────────────────────────────

export function FeedbackDrawer() {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);

  const [useful, setUseful] = useState<boolean | null>(null);
  const [improvement, setImprovement] = useState("");
  const [wouldUseAgain, setWouldUseAgain] = useState<YesNoMaybe | null>(null);
  const [wouldPayPremium, setWouldPayPremium] = useState<YesNoMaybe | null>(null);

  const canSubmit = useful !== null || improvement.trim() || wouldUseAgain || wouldPayPremium;

  const handleSubmit = () => {
    saveFeedback({
      id: `fb-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      submittedAt: Date.now(),
      useful,
      improvement: improvement.trim(),
      wouldUseAgain,
      wouldPayPremium,
    });
    setDone(true);
  };

  const handleClose = () => {
    setOpen(false);
    // Reset form state after animation completes
    setTimeout(() => {
      if (!done) return;
      setDone(false);
      setUseful(null);
      setImprovement("");
      setWouldUseAgain(null);
      setWouldPayPremium(null);
    }, 400);
  };

  return (
    <>
      {/* ── Fixed trigger button ─────────────────────────────── */}
      <div className="fixed bottom-6 left-0 right-0 flex justify-center z-40 pointer-events-none">
        <motion.button
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.4 }}
          onClick={() => setOpen(true)}
          className="pointer-events-auto flex items-center gap-2 bg-card border border-border/70 text-foreground/80 text-sm font-medium px-5 py-2.5 rounded-full shadow-md hover:shadow-lg hover:border-primary/40 hover:text-primary transition-all"
        >
          <MessageSquarePlus size={16} strokeWidth={1.8} />
          Enviar opinión
        </motion.button>
      </div>

      {/* ── Backdrop + Drawer ────────────────────────────────── */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="fixed inset-0 z-50 bg-foreground/20 backdrop-blur-sm"
              onClick={handleClose}
            />

            {/* Drawer */}
            <motion.div
              key="drawer"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 34 }}
              className="fixed bottom-0 left-0 right-0 z-50 flex justify-center"
            >
              <div className="w-full max-w-[480px] bg-card rounded-t-3xl shadow-2xl border border-border/60 border-b-0 max-h-[92dvh] flex flex-col">
                {/* Handle */}
                <div className="flex justify-center pt-3 pb-1 shrink-0">
                  <div className="w-10 h-1 bg-border rounded-full" />
                </div>

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 shrink-0">
                  <div>
                    <p className="font-serif text-[17px] font-medium text-foreground">Tu opinión importa</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Menos de un minuto · Opcional</p>
                  </div>
                  <button
                    onClick={handleClose}
                    className="p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto overscroll-contain">
                  <AnimatePresence mode="wait">
                    {done ? (
                      /* ── Thank you screen ── */
                      <motion.div
                        key="thanks"
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col items-center justify-center text-center px-8 py-16 gap-5"
                      >
                        <div className="w-16 h-16 bg-secondary/30 rounded-full flex items-center justify-center text-secondary-foreground">
                          <CheckCircle2 size={30} strokeWidth={1.5} />
                        </div>
                        <div>
                          <p className="font-serif text-xl font-medium text-foreground mb-2">
                            ¡Gracias!
                          </p>
                          <p className="text-sm text-muted-foreground leading-relaxed max-w-[240px]">
                            Gracias por ayudarnos a mejorar Recetario de la Paz
                          </p>
                        </div>
                        <button
                          onClick={handleClose}
                          className="mt-2 text-sm text-primary font-medium flex items-center gap-1.5 hover:underline"
                        >
                          Volver a la app
                          <ChevronRight size={14} />
                        </button>
                      </motion.div>
                    ) : (
                      /* ── Form ── */
                      <motion.div
                        key="form"
                        exit={{ opacity: 0 }}
                        className="px-6 py-6 space-y-7 pb-10"
                      >
                        {/* Q1 */}
                        <div>
                          <p className="font-medium text-foreground mb-3">¿Te fue útil la app?</p>
                          <PillGroup
                            options={YES_NO}
                            value={useful === null ? null : useful ? "si" : "no"}
                            onChange={(v) => setUseful(v === "si")}
                          />
                        </div>

                        {/* Q2 */}
                        <div>
                          <p className="font-medium text-foreground mb-3">¿Qué mejorarías?</p>
                          <Textarea
                            placeholder="Contanos qué cambiarías o qué te faltó..."
                            value={improvement}
                            onChange={(e) => setImprovement(e.target.value)}
                            rows={3}
                            className="rounded-xl border-border/60 bg-background focus-visible:ring-primary/50 text-sm resize-none"
                          />
                        </div>

                        {/* Q3 */}
                        <div>
                          <p className="font-medium text-foreground mb-3">¿La usarías de nuevo?</p>
                          <PillGroup
                            options={YES_NO_MAYBE}
                            value={wouldUseAgain}
                            onChange={(v) => setWouldUseAgain(v as YesNoMaybe)}
                          />
                        </div>

                        {/* Q4 */}
                        <div>
                          <p className="font-medium text-foreground mb-3">¿Pagarías por Premium?</p>
                          <PillGroup
                            options={YES_NO_MAYBE}
                            value={wouldPayPremium}
                            onChange={(v) => setWouldPayPremium(v as YesNoMaybe)}
                          />
                        </div>

                        {/* Submit */}
                        <Button
                          onClick={handleSubmit}
                          disabled={!canSubmit}
                          className="w-full h-13 rounded-xl text-[16px] font-medium bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm disabled:opacity-40"
                        >
                          Enviar opinión
                        </Button>
                        <p className="text-center text-xs text-muted-foreground -mt-3">
                          Todas las preguntas son opcionales
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
