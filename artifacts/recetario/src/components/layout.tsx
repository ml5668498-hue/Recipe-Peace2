import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { ChevronLeft } from "lucide-react";
import { motion } from "framer-motion";

export function Layout({ children, title, showBack = true }: { children: ReactNode; title?: string; showBack?: boolean }) {
  const [location] = useLocation();
  const isHome = location === "/";

  return (
    <div className="min-h-[100dvh] w-full bg-background flex justify-center overflow-x-hidden font-sans text-foreground">
      <div className="w-full max-w-[480px] bg-card/30 min-h-[100dvh] flex flex-col relative shadow-sm border-x border-border/50">
        {!isHome && showBack && (
          <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border/50 px-4 py-4 flex items-center gap-3">
            <Link href="/" className="p-2 -ml-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
              <ChevronLeft size={24} />
            </Link>
            {title && <h1 className="font-serif text-lg font-medium tracking-tight text-foreground">{title}</h1>}
          </header>
        )}
        <main className="flex-1 flex flex-col relative">
          {children}
        </main>
      </div>
    </div>
  );
}
