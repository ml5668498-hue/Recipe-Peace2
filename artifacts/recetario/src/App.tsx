import { useState } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
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

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/recetas" component={Recipes} />
      <Route path="/menu" component={Menu} />
      <Route path="/planner" component={Planner} />
      <Route path="/mi-recetario" component={MyRecetario} />
      <Route path="/premium" component={Premium} />
      <Route path="/admin" component={AdminWaitlist} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [welcomed, setWelcomed] = useState<boolean>(
    () => localStorage.getItem("recetario_welcomed") === "true"
  );

  const handleWelcomeDone = () => {
    localStorage.setItem("recetario_welcomed", "true");
    setWelcomed(true);
  };

  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  const isAdmin = window.location.pathname === `${base}/admin` || window.location.pathname === "/admin";

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        {isAdmin ? (
          <WouterRouter base={base}>
            <Router />
          </WouterRouter>
        ) : !welcomed ? (
          <Welcome onDone={handleWelcomeDone} />
        ) : (
          <WouterRouter base={base}>
            <Router />
          </WouterRouter>
        )}
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
