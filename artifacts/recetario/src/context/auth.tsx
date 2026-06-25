import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Subscription {
  subscription_status: "trial" | "active" | "expired";
  premium: boolean;
  trial_start: string;
  trial_end: string;
  days_left: number;
}

interface AuthContextValue {
  user: User | null;
  subscription: Subscription | null;
  token: string | null;
  loading: boolean;
  login: (token: string, user: User, subscription: Subscription) => void;
  logout: () => void;
  refreshSubscription: () => Promise<void>;
  hasAccess: boolean;
  isPremium: boolean;
  trialDaysLeft: number | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("auth_token"));
  const [user, setUser] = useState<User | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem("auth_token");
    setToken(null);
    setUser(null);
    setSubscription(null);
  }, []);

  // Inject Authorization header on all /api/ requests (except waitlist/admin)
  useEffect(() => {
    const orig = window.fetch.bind(window);
    const tok = token;

    window.fetch = async function (input: RequestInfo | URL, init: RequestInit = {}) {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
          ? input.href
          : (input as Request).url;

      const isApi = url.includes("/api/") && !url.includes("/api/waitlist");

      if (tok && isApi) {
        init = {
          ...init,
          headers: { Authorization: `Bearer ${tok}`, ...(init.headers ?? {}) },
        };
      }

      return orig(input, init);
    };

    return () => { window.fetch = orig; };
  }, [token]);

  const fetchMe = useCallback(async (t: string) => {
    try {
      const res = await fetch(`${BASE}/api/auth/me`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (!res.ok) { logout(); return; }
      const data = (await res.json()) as { user: User; subscription: Subscription };
      setUser(data.user);
      setSubscription(data.subscription);
    } catch {
      logout();
    }
  }, [logout]);

  useEffect(() => {
    if (token) {
      fetchMe(token).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token, fetchMe]);

  const login = (t: string, u: User, s: Subscription) => {
    localStorage.setItem("auth_token", t);
    setToken(t);
    setUser(u);
    setSubscription(s);
  };

  const refreshSubscription = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${BASE}/api/subscriptions/status`);
      if (res.ok) setSubscription((await res.json()) as Subscription);
    } catch { /* silent */ }
  };

  const hasAccess =
    subscription?.subscription_status === "trial" ||
    subscription?.subscription_status === "active";

  const isPremium = subscription?.premium === true;

  const trialDaysLeft =
    subscription?.subscription_status === "trial"
      ? subscription.days_left
      : null;

  return (
    <AuthContext.Provider
      value={{ user, subscription, token, loading, login, logout, refreshSubscription, hasAccess, isPremium, trialDaysLeft }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
