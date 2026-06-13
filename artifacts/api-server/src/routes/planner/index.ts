import { Router, type IRouter } from "express";
import OpenAI from "openai";
import { GeneratePlannerBody, GeneratePlannerResponse } from "@workspace/api-zod";
import { fallbackGeneratePlanner } from "../../lib/fallback-generator";

const router: IRouter = Router();

function getGroqClient(): OpenAI | null {
  if (!process.env.GROQ_API_KEY) return null;
  return new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: "https://api.groq.com/openai/v1",
  });
}

router.post("/planner/generate", async (req, res): Promise<void> => {
  const parsed = GeneratePlannerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { preferences } = parsed.data;
  const groq = getGroqClient();

  if (!groq) {
    req.log.info("No GROQ_API_KEY — using fallback planner (free mode)");
    res.json(fallbackGeneratePlanner());
    return;
  }

  const prefNote = preferences ? `Preferencias: ${preferences}.` : "";

  try {
    const prompt = `Eres un nutricionista familiar. Crea un planner semanal (Lunes a Domingo) saludable y económico.
${prefNote}

Responde ÚNICAMENTE con un JSON válido con este formato:

{
  "days": [
    {
      "day": "Lunes",
      "breakfast": { "name": "...", "estimatedTime": "...", "difficulty": "Fácil", "tags": ["económica"] },
      "lunch":     { "name": "...", "estimatedTime": "...", "difficulty": "Fácil", "tags": ["familiar"] },
      "snack":     { "name": "...", "estimatedTime": "...", "difficulty": "Fácil", "tags": ["rápida"] },
      "dinner":    { "name": "...", "estimatedTime": "...", "difficulty": "Fácil", "tags": ["económica", "familiar"] }
    }
  ],
  "shoppingList": [
    { "category": "Verduras",  "items": ["zanahoria", "tomate"] },
    { "category": "Proteínas", "items": ["pollo", "huevos"] },
    { "category": "Cereales",  "items": ["arroz", "avena"] },
    { "category": "Lácteos",   "items": ["leche", "yogur"] },
    { "category": "Básicos de despensa", "items": ["aceite", "sal"] }
  ],
  "weeklySavingsMessage": "Esta semana podrías ahorrar aproximadamente $4500 cocinando en casa en lugar de pedir delivery"
}

Reglas:
- difficulty: exactamente "Fácil", "Medio" o "Difícil"
- tags: solo "económica", "rápida" o "familiar"
- Genera exactamente 7 días: Lunes, Martes, Miércoles, Jueves, Viernes, Sábado, Domingo
- La lista de compras agrupa todos los ingredientes de la semana`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 5000,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) throw new Error("Empty response from Groq");

    const rawData = JSON.parse(content);
    const validated = GeneratePlannerResponse.safeParse(rawData);
    if (!validated.success) {
      req.log.warn({ errors: validated.error.message }, "Groq response schema mismatch — falling back");
      res.json(fallbackGeneratePlanner());
      return;
    }

    res.json(validated.data);
  } catch (err) {
    req.log.warn({ err }, "Groq call failed — falling back to internal planner");
    res.json(fallbackGeneratePlanner());
  }
});

export default router;
