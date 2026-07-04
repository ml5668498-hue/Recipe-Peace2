import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Si se define VITE_API_URL, redirige los pedidos relativos "/api/..."
// hacia ese backend (por ejemplo, tu servidor en Render).
const API_BASE = import.meta.env.VITE_API_URL as string | undefined;
if (API_BASE) {
  const originalFetch = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    if (typeof input === "string" && input.startsWith("/api/")) {
      input = API_BASE.replace(/\/$/, "") + input;
    }
    return originalFetch(input, init);
  };
}

createRoot(document.getElementById("root")!).render(<App />);
