import { useState, useEffect } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Recipes from "@/pages/recipes";
import Menu from "@/pages/menu";
import Planner from "@/pages/planner";
import MyRecetario from "@/pages/my-recetario";
import Welcome from "@/pages/welcome";
import Premium from "@/pages/premium";
import AdminWaitlist from "@/pages/admin-waitlist";
import Login from "@/pages/login";
import Register from "@/pages/register";
import Subscribe from "@/pages/subscribe";
import { AuthProvider, useAuth } from "@/context/auth";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, hasAccess, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (loading) return;
    if (!user) { setLocation("/login"); return; }
    if (!hasAccess) { setLocation("/upgrade"); return; }
  }, [user, hasAccess, loading, setLocation]);

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background">
        <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || !hasAccess) return null;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Switch>
      {/* Public routes */}
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/upgrade" component={Subscribe} />
      <Route path="/premium" component={Premium} />
      <Route path="/admin" component={AdminWaitlist} />

      {/* Protected routes */}
      <Route path="/">
        <ProtectedRoute><Home /></ProtectedRoute>
      </Route>
      <Route path="/recetas">
        <ProtectedRoute><Recipes /></ProtectedRoute>
      </Route>
      <Route path="/menu">
        <ProtectedRoute><Menu /></ProtectedRoute>
      </Route>
      <Route path="/planner">
        <ProtectedRoute><Planner /></ProtectedRoute>
      </Route>
      <Route path="/mi-recetario">
        <ProtectedRoute><MyRecetario /></ProtectedRoute>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function AppShell() {
  const { user, loading } = useAuth();
  const [location] = useLocation();
  const [welcomed, setWelcomed] = useState<boolean>(
    () => localStorage.getItem("recetario_welcomed") === "true"
  );

  const handleWelcomeDone = () => {
    localStorage.setItem("recetario_welcomed", "true");
    setWelcomed(true);
  };

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background">
        <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const publicPaths = ["/login", "/register", "/upgrade", "/premium", "/admin"];
  const isPublicPage = publicPaths.some(p => location === p || location.startsWith(p + "/"));

  // Show welcome only for unauthenticated users on the root path who haven't seen it
  const showWelcome = !isPublicPage && !welcomed && !user && location === "/";

  if (showWelcome) {
    return <Welcome onDone={handleWelcomeDone} />;
  }

  return <AppRoutes />;
}

function App() {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={base}>
          <AuthProvider>
            <AppShell />
            <Toaster />
          </AuthProvider>
        </WouterRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
