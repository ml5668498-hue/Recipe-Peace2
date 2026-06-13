---
name: Groq via OpenAI SDK
description: How to use Groq without installing groq-sdk — just point the openai package at Groq's base URL
---

Use the already-installed `openai` package with Groq by setting `baseURL`:

```typescript
new OpenAI({ apiKey: process.env.GROQ_API_KEY, baseURL: "https://api.groq.com/openai/v1" })
```

Model to use: `llama-3.3-70b-versatile` (good JSON output, fast, free tier available).

**Why:** avoids adding a second AI SDK dependency when the openai package already supports any OpenAI-compatible endpoint.

**How to apply:** any route that previously used OpenAI can be migrated by wrapping client creation in a `getGroqClient()` function that reads `GROQ_API_KEY`.
