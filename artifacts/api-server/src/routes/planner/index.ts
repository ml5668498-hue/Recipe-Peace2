import { Router, type IRouter } from "express";
import OpenAI from "openai";
import { GeneratePlannerBody, GeneratePlannerResponse } from "@workspace/api-zod";

const router: IRouter = Router();

function getOpenAI(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set");
  }
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

router.post("/planner/generate", async (req, res): Promise<void> => {
  const parsed = GeneratePlannerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { preferences } = parsed.data;
  const prefNote = preferences ? `Preferencias adicionales: ${preferences}.` : "";

  try {
    const openai = getOpenAI();
    const prompt = `Eres un nutricionista familiar especializado en planificación alimentaria saludable y económica. Crea un planner semanal completo (Lunes a Domingo) para una familia.
${prefNote}

Responde ÚNICAMENTE con un JSON válido (sin texto adicional) con este formato exacto:

{
  "days": [
    {
      "day": "Lunes",
      "breakfast": {
        "name": "Nombre de la receta",
        "estimatedTime": "15 minutos",
        "difficulty": "Fácil",
        "tags": ["económica", "rápida"]
      },
      "lunch": { ...igual... },
      "snack": { ...igual... },
      "dinner": { ...igual... }
    },
    { "day": "Martes", ... },
    { "day": "Miércoles", ... },
    { "day": "Jueves", ... },
    { "day": "Viernes", ... },
    { "day": "Sábado", ... },
    { "day": "Domingo", ... }
  ],
  "shoppingList": [
    {
      "category": "Verduras",
      "items": ["zanahoria", "lechuga", "tomate", "cebolla"]
    },
    {
      "category": "Proteínas",
      "items": ["pollo", "huevos", "atún"]
    },
    {
      "category": "Cereales",
      "items": ["arroz", "avena", "pasta"]
    },
    {
      "category": "Lácteos",
      "items": ["leche", "yogur", "queso"]
    },
    {
      "category": "Básicos de despensa",
      "items": ["aceite", "sal", "ajo", "harina"]
    }
  ],
  "weeklySavingsMessage": "Esta semana podrías ahorrar aproximadamente $3500 cocinando en casa en lugar de pedir delivery"
}

Reglas:
- difficulty debe ser exactamente "Fácil", "Medio" o "Difícil"
- tags puede incluir "económica", "rápida", "familiar" — elige los que apliquen
- Las comidas deben ser variadas, sin repetirse demasiado en la semana
- Usa ingredientes cotidianos y accesibles en Latinoamérica
- La lista de compras debe consolidar todos los ingredientes de la semana
- El mensaje de ahorro debe incluir un monto realista en pesos latinoamericanos (entre $2000 y $8000 ARS / $150 y $500 MXN)
- Genera exactamente 7 días`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 6000,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      res.status(500).json({ error: "No se pudo generar la respuesta" });
      return;
    }

    const rawData = JSON.parse(content);
    const validated = GeneratePlannerResponse.safeParse(rawData);
    if (!validated.success) {
      req.log.warn({ errors: validated.error.message }, "AI planner response did not match schema");
      res.status(500).json({ error: "Formato de respuesta inválido" });
      return;
    }

    res.json(validated.data);
  } catch (err) {
    req.log.error({ err }, "Error generating planner");
    if (err instanceof Error && err.message === "OPENAI_API_KEY is not set") {
      res.status(500).json({ error: "API key de OpenAI no configurada" });
      return;
    }
    res.status(500).json({ error: "Error al generar el planner. Por favor intenta de nuevo." });
  }
});

export default router;
