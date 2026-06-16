import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Heart, Sparkles, Calendar as CalendarIcon, Clock, ChevronDown, CheckCircle2, ChevronRight, Leaf, Salad } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { z } from "zod";

export default function App() {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleWaitlist = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !email) {
      toast({
        title: "Completa los campos",
        description: "Por favor, ingresa tu nombre y email para unirte.",
        variant: "destructive",
      });
      return;
    }

    const emailSchema = z.string().email();
    if (!emailSchema.safeParse(email).success) {
      toast({
        title: "Email inválido",
        description: "Por favor, ingresa una dirección de email válida.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });

      if (res.ok) {
        toast({
          title: "¡Estás en la lista!",
          description: "Te avisaremos cuando Premium esté disponible.",
        });
        setName("");
        setEmail("");
      } else {
        const body = await res.json().catch(() => ({}));
        if (res.status === 409) {
          toast({
            title: "Ya estás en la lista",
            description: "Este email ya está registrado. ¡Te avisaremos pronto!",
          });
        } else {
          toast({
            title: "Error al registrarse",
            description: body.error ?? "Intenta de nuevo en un momento.",
            variant: "destructive",
          });
        }
      }
    } catch {
      toast({
        title: "Error de conexión",
        description: "No se pudo conectar. Intenta de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const scrollToHowItWorks = () => {
    const el = document.getElementById("how-it-works");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-dvh bg-background text-foreground selection:bg-primary/20">
      <div className="max-w-[480px] mx-auto bg-white shadow-xl shadow-black/5 min-h-dvh flex flex-col relative overflow-hidden">
        
        {/* Decorative background elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-secondary/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="absolute top-[20%] left-0 w-72 h-72 bg-primary/10 rounded-full blur-3xl -translate-x-1/2 pointer-events-none" />
        
        {/* Navigation */}
        <nav className="p-6 flex items-center justify-between relative z-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Leaf className="w-4 h-4 text-primary" />
            </div>
            <span className="font-serif font-medium text-lg text-primary tracking-tight">Recetario de la Paz</span>
          </div>
        </nav>

        <main className="flex-1 pb-20 z-10 relative">
          
          {/* Hero Section */}
          <section className="px-6 pt-8 pb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              <h1 className="font-serif text-4xl md:text-5xl leading-[1.1] text-foreground mb-6">
                Deja de estresarte pensando qué cocinar
              </h1>
              <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                Recetas con lo que tienes, menús semanales y organización alimentaria para vivir con más calma.
              </p>
              <div className="flex flex-col gap-4">
                <Button asChild size="lg" className="h-14 rounded-2xl text-base shadow-sm hover:shadow-md transition-all">
                  <Link href="/">Probar gratis</Link>
                </Button>
                <Button variant="ghost" size="lg" className="h-14 rounded-2xl text-base" onClick={scrollToHowItWorks}>
                  Ver cómo funciona <ChevronDown className="w-4 h-4 ml-2 opacity-50" />
                </Button>
              </div>
            </motion.div>
          </section>

          {/* Problem Section */}
          <section className="px-6 py-16 bg-secondary/20">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="font-serif text-2xl mb-8">¿Te resulta familiar?</h2>
              <div className="space-y-4">
                {[
                  "Ansiedad al decidir qué cocinar cada día",
                  "Gasto excesivo en delivery por falta de planificación",
                  "Alimentos que se vencen sin usarse",
                  "Semanas de comida desorganizadas y repetitivas"
                ].map((problem, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1, duration: 0.5 }}
                    className="flex items-start gap-4 bg-white/50 p-4 rounded-2xl border border-secondary/30"
                  >
                    <div className="w-6 h-6 rounded-full bg-secondary/40 flex items-center justify-center shrink-0 mt-0.5">
                      <div className="w-2 h-2 rounded-full bg-secondary/80" />
                    </div>
                    <span className="text-foreground/80 font-medium">{problem}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </section>

          {/* Solution Section */}
          <section className="px-6 py-16">
            <div className="mb-12">
              <h2 className="font-serif text-3xl mb-4">La solución: un sistema diseñado para la paz mental</h2>
            </div>
            
            <div className="grid gap-6">
              <SolutionCard 
                icon={<Sparkles className="w-5 h-5 text-primary" />}
                title="Recetas instantáneas"
                description="ingresás tus ingredientes y recibís recetas reconfortantes al instante"
              />
              <SolutionCard 
                icon={<Heart className="w-5 h-5 text-primary" />}
                title="Menú Anti Ansiedad"
                description="un menú diario o semanal que elimina la carga de decidir qué comer"
              />
              <SolutionCard 
                icon={<CalendarIcon className="w-5 h-5 text-primary" />}
                title="Planner Familiar"
                description="organizá la semana entera con lista de compras por categorías"
              />
              <SolutionCard 
                icon={<Salad className="w-5 h-5 text-primary" />}
                title="Ahorro Semanal"
                description="estimación de cuánto podés ahorrar planificando tus comidas"
              />
            </div>
          </section>

          {/* How It Works */}
          <section id="how-it-works" className="px-6 py-16 bg-primary/5 rounded-[2.5rem] mx-2">
            <h2 className="font-serif text-3xl mb-10 text-center">¿Cómo funciona?</h2>
            <div className="space-y-10 relative">
              <div className="absolute left-6 top-8 bottom-8 w-px bg-primary/20" />
              
              <Step 
                number="1"
                title="Escribí tus ingredientes"
                description="ingresá lo que tenés en casa"
              />
              <Step 
                number="2"
                title="Recibí tus recetas"
                description="la IA te genera opciones reconfortantes en segundos"
              />
              <Step 
                number="3"
                title="Organizá tu semana"
                description="creá tu menú y planner con un toque"
              />
            </div>
          </section>

          {/* Benefits */}
          <section className="px-6 py-20">
            <h2 className="font-serif text-3xl mb-10">Lo que vas a lograr</h2>
            <div className="space-y-6">
              {[
                { title: "Menos estrés", desc: "tomá decisiones de comida sin agotarte mentalmente" },
                { title: "Más ahorro", desc: "reducí el desperdicio y el gasto en delivery" },
                { title: "Más organización", desc: "siempre sabrás qué cocinar y qué comprar" },
                { title: "Mejor alimentación", desc: "comidas equilibradas y reconfortantes para toda la familia" },
              ].map((benefit, i) => (
                <div key={i} className="flex gap-4 items-start">
                  <CheckCircle2 className="w-6 h-6 text-secondary shrink-0" />
                  <div>
                    <h3 className="font-serif text-lg font-medium text-foreground">{benefit.title}</h3>
                    <p className="text-muted-foreground">{benefit.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Testimonials */}
          <section className="px-6 py-16 bg-secondary/10">
            <h2 className="font-serif text-3xl mb-10">Miles de familias cocinando con más calma</h2>
            
            <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-8 -mx-6 px-6 scrollbar-none">
              <Testimonial 
                quote="Desde que uso Recetario de la Paz, el momento 'qué comemos hoy' ya no me genera ansiedad. Es como tener una amiga que sabe cocinar."
                author="Valentina M."
                location="Buenos Aires"
              />
              <Testimonial 
                quote="Ahorré como $15,000 al mes en delivery solo con el planner semanal. No lo puedo creer."
                author="Martín R."
                location="Córdoba"
              />
              <Testimonial 
                quote="Mis hijos comen más variado y yo me siento más organizada. Por fin una app que entiende la vida real."
                author="Lucía G."
                location="Rosario"
              />
            </div>
          </section>

          {/* Waitlist */}
          <section className="px-6 py-20">
            <div className="bg-primary text-primary-foreground p-8 rounded-3xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
              
              <div className="relative z-10">
                <h2 className="font-serif text-2xl mb-3">Únete a la lista de espera Premium</h2>
                <p className="text-primary-foreground/80 mb-8 leading-relaxed">
                  Sé de los primeros en acceder a funciones exclusivas, recetas ilimitadas y personalización total.
                </p>
                
                <form onSubmit={handleWaitlist} className="space-y-4">
                  <Input 
                    placeholder="Tu nombre" 
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50 h-12 rounded-xl focus-visible:ring-white/30"
                    value={name}
                    onChange={e => setName(e.target.value)}
                  />
                  <Input 
                    type="email"
                    placeholder="tu@email.com" 
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50 h-12 rounded-xl focus-visible:ring-white/30"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                  <Button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="w-full h-12 rounded-xl bg-white text-primary hover:bg-white/90 shadow-sm mt-2"
                  >
                    {isSubmitting ? "Uniendo..." : "Unirme a la lista"}
                  </Button>
                </form>
              </div>
            </div>
          </section>

          {/* FAQ */}
          <section className="px-6 py-10">
            <h2 className="font-serif text-3xl mb-8">Preguntas frecuentes</h2>
            <Accordion type="single" collapsible className="w-full">
              {[
                { q: "¿Es gratis?", a: "Sí, la versión básica es completamente gratis. Recetas, menús y planner sin costo." },
                { q: "¿Necesito crear una cuenta?", a: "No. La app funciona sin registro. Tus recetas se guardan en tu dispositivo." },
                { q: "¿Funciona sin internet?", a: "Necesitás conexión para generar recetas con IA. Tus favoritos guardados funcionan sin internet." },
                { q: "¿En qué países está disponible?", a: "Está disponible en toda Latinoamérica y España." },
                { q: "¿Cuándo llega Premium?", a: "Estamos trabajando en ello. Anotate en la lista de espera y te avisamos primero." },
              ].map((faq, i) => (
                <AccordionItem key={i} value={`item-${i}`} className="border-b-primary/10">
                  <AccordionTrigger className="font-serif text-left text-[1.1rem] hover:no-underline py-5 text-foreground/80 hover:text-foreground">
                    {faq.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground pb-5 leading-relaxed text-base">
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>

        </main>

        <footer className="bg-foreground text-background py-10 px-6 text-center mt-auto rounded-t-3xl">
          <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-6">
            <Leaf className="w-5 h-5 text-white/80" />
          </div>
          <h3 className="font-serif text-xl mb-6">Recetario de la Paz<br/><span className="text-white/60 text-lg">Cocina con calma</span></h3>
          <Button asChild variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white rounded-xl h-12 px-8 mb-12">
            <Link href="/">Abrir la app</Link>
          </Button>
          <p className="text-sm text-white/40">Hecho con amor en Argentina</p>
        </footer>
      </div>
    </div>
  );
}

function SolutionCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <motion.div 
      whileHover={{ y: -2 }}
      className="bg-white p-6 rounded-3xl border border-primary/10 shadow-sm flex flex-col gap-4 relative overflow-hidden group"
    >
      <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors" />
      <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary relative z-10">
        {icon}
      </div>
      <div className="relative z-10">
        <h3 className="font-serif text-xl mb-2 text-foreground">{title}</h3>
        <p className="text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </motion.div>
  );
}

function Step({ number, title, description }: { number: string, title: string, description: string }) {
  return (
    <div className="flex gap-6 relative z-10">
      <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-serif text-xl shrink-0 shadow-sm">
        {number}
      </div>
      <div className="pt-2">
        <h3 className="font-serif text-xl mb-1">{title}</h3>
        <p className="text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

function Testimonial({ quote, author, location }: { quote: string, author: string, location: string }) {
  return (
    <div className="w-[85vw] max-w-[320px] shrink-0 snap-center bg-white p-6 rounded-3xl border border-secondary/20 shadow-sm flex flex-col">
      <div className="flex gap-1 mb-4">
        {[1,2,3,4,5].map(star => (
          <Sparkles key={star} className="w-4 h-4 text-primary fill-primary" />
        ))}
      </div>
      <p className="text-foreground/80 leading-relaxed mb-6 flex-1 text-lg">"{quote}"</p>
      <div className="mt-auto">
        <p className="font-medium text-foreground">{author}</p>
        <p className="text-sm text-muted-foreground">{location}</p>
      </div>
    </div>
  );
}
