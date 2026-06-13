# Recetario de la Paz

App mobile-first de cocina anti ansiedad que genera recetas, menús y planners semanales con IA.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/recetario run dev` — run the frontend (port 24592)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- Required env: `OPENAI_API_KEY` — OpenAI API key for recipe/menu/planner generation

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, wouter, TanStack Query, Framer Motion, shadcn/ui, Tailwind CSS
- API: Express 5
- DB: PostgreSQL + Drizzle ORM (not yet used — AI-only for now)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- AI: OpenAI `gpt-4o-mini` via direct API key

## Where things live

- `lib/api-spec/openapi.yaml` — single source of truth for API contracts
- `artifacts/recetario/src/pages/` — Home, Recipes, Menu, Planner pages
- `artifacts/recetario/src/components/layout.tsx` — shared mobile layout with nav
- `artifacts/recetario/src/index.css` — warm beige/sage/terracotta theme
- `artifacts/api-server/src/routes/recipes/` — recipe generation route (POST /api/recipes/generate)
- `artifacts/api-server/src/routes/menu/` — menu generation route (POST /api/menu/generate)
- `artifacts/api-server/src/routes/planner/` — planner generation route (POST /api/planner/generate)

## Architecture decisions

- AI-only backend (no DB persistence yet) — OpenAI `gpt-4o-mini` with `response_format: json_object` for structured output
- All AI routes validate responses with Zod schemas from codegen before returning
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

- `OPENAI_API_KEY` must be set as a secret — the app shows a clear error if missing
- API server uses `gpt-4o-mini` (not `gpt-5`) to keep costs low
- All AI response JSON is validated with Zod — if schema mismatches, returns 500 with message
- After any OpenAPI spec change: run `pnpm --filter @workspace/api-spec run codegen` before touching routes or frontend

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
