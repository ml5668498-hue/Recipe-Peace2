# Recetario de la Paz

App mobile-first de cocina anti ansiedad que genera recetas, menús y planners semanales con IA.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/recetario run dev` — run the frontend (port 24592)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- Required env: `GROQ_API_KEY` — Groq API key for AI-powered generation (optional — app works without it via fallback)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, wouter, TanStack Query, Framer Motion, shadcn/ui, Tailwind CSS
- API: Express 5
- DB: PostgreSQL + Drizzle ORM (not yet used — AI-only for now)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- AI: Groq `llama-3.3-70b-versatile` via OpenAI-compatible SDK (base URL swap)
- Fallback: internal recipe DB (32 recipes) when no API key or Groq fails

## Where things live

- `lib/api-spec/openapi.yaml` — single source of truth for API contracts
- `artifacts/recetario/src/pages/` — Home, Recipes, Menu, Planner pages
- `artifacts/recetario/src/components/layout.tsx` — shared mobile layout with nav
- `artifacts/recetario/src/index.css` — warm beige/sage/terracotta theme
- `artifacts/api-server/src/routes/recipes/` — recipe generation route (POST /api/recipes/generate)
- `artifacts/api-server/src/routes/menu/` — menu generation route (POST /api/menu/generate)
- `artifacts/api-server/src/routes/planner/` — planner generation route (POST /api/planner/generate)
- `artifacts/api-server/src/lib/recipes-db.ts` — 32 internal recipes with ingredient matching
- `artifacts/api-server/src/lib/fallback-generator.ts` — fallback logic for all 3 modules

## Architecture decisions

- Primary AI: Groq `llama-3.3-70b-versatile` via OpenAI SDK with `baseURL: https://api.groq.com/openai/v1`
- Hybrid model: Groq when `GROQ_API_KEY` is set (premium), internal recipe DB fallback otherwise (free)
- All AI routes try Groq → validate with Zod → fallback to internal DB on any error
- Home page shows static "Modo gratis activo" banner with "Desbloquear IA personalizada" button (payments not wired yet)
- Mobile-first: max-width ~480px, big touch targets, no dark mode
- Framer Motion for page transitions and staggered card entrances
- No auth, no payments in this MVP

## Product

Three modules:
1. **¿Qué cocino con lo que tengo?** (`/recetas`) — enter available ingredients → get 3 recipes with anti-anxiety tips
2. **Menú Anti Ansiedad** (`/menu`) — choose day/week + quick option → full meal plan with calm messages
3. **Planner Saludable Familiar** (`/planner`) — generate weekly family planner + shopping list by category + weekly savings estimate

## User preferences

- Spanish language throughout
- Warm palette: beige, sage green, white, terracotta
- Mobile-first, big buttons, no emojis (Lucide icons only)
- No planner/shopping list payments yet

## Gotchas

- `GROQ_API_KEY` is optional — without it the app works silently using the internal recipe DB (free mode)
- Groq uses model `llama-3.3-70b-versatile` with `response_format: json_object`
- All AI responses are validated with Zod; on mismatch or error the server falls back to internal DB (never crashes)
- The OpenAI SDK is reused for Groq by pointing `baseURL` at `https://api.groq.com/openai/v1`
- After any OpenAPI spec change: run `pnpm --filter @workspace/api-spec run codegen` before touching routes or frontend

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
