---
name: Hybrid AI/fallback pattern
description: Pattern used in Recetario routes — try Groq first, silently fall back to internal recipe DB
---

Each API route (recipes, menu, planner) follows this pattern:

1. Call `getGroqClient()` — returns `null` if `GROQ_API_KEY` is not set
2. If null → immediately return `fallbackGenerate*()` result (no error)
3. If client exists → call Groq → validate response with Zod
4. If Zod fails or any exception → `req.log.warn(...)` and return fallback result
5. Never throw 500 to the client unless the request body itself is invalid

Internal DB lives in `artifacts/api-server/src/lib/recipes-db.ts` (32 recipes).
Fallback generators in `artifacts/api-server/src/lib/fallback-generator.ts`.

**Why:** the app must always produce a useful result. A missing API key should degrade gracefully, not block the user.

**How to apply:** wrap every AI call in try/catch and check for key presence before calling the SDK.
