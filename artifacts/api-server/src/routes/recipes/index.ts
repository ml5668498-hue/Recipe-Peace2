import { Router, type IRouter } from "express";
import OpenAI from "openai";
import { GenerateRecipesBody, GenerateRecipesResponse } from "@workspace/api-zod";
import { logger } from "../../lib/logger";

const router: IRouter = Router();

function getOpenAI(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set");
  }
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

router.post("/recipes/generate", async (req, res): Promise<void> => {
  const parsed = GenerateRecipesBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { ingredients } = parsed.data;

  try {
    const openai = getOpenAI();
    const prompt = `Eres un chef amable especializado en cocina anti ansiedad alimentaria. El usuario tiene estos ingredientes disponibles: ${ingredients.join(", ")}.

Genera exactamente 3 recetas usando principalmente esos ingredientes. Responde ÚNICAMENTE con un JSON válido (sin texto adicional) con este formato exacto:

{
  "recipes": [
    {
      "name": "Nombre de la receta",
      "usedIngredients": ["ingrediente1", "ingrediente2"],
      "steps": ["Paso 1", "Paso 2", "Paso 3"],
      "estimatedTime": "20 minutos",
      "difficulty": "Fácil",
      "antiAnxietyTip": "Un consejo breve y calmante relacionado con esta receta o con comer sin ansiedad"
    }
  ]
}

Reglas:
- difficulty debe ser exactamente "Fácil", "Medio" o "Difícil"
- Los pasos deben ser simples, claros y sin tecnicismos
- El antiAnxietyTip debe ser cálido, breve y reconfortante
- Usa ingredientes cotidianos y accesibles
- Máximo 6 pasos por receta`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      res.status(500).json({ error: "No se pudo generar la respuesta" });
      return;
    }

    const rawData = JSON.parse(content);
    const validated = GenerateRecipesResponse.safeParse(rawData);
    if (!validated.success) {
      req.log.warn({ errors: validated.error.message }, "AI response did not match schema");
      res.status(500).json({ error: "Formato de respuesta inválido" });
      return;
    }

    res.json(validated.data);
  } catch (err) {
    req.log.error({ err }, "Error generating recipes");
    if (err instanceof Error && err.message === "OPENAI_API_KEY is not set") {
      res.status(500).json({ error: "API key de OpenAI no configurada" });
      return;
    }
    res.status(500).json({ error: "Error al generar recetas. Por favor intenta de nuevo." });
  }
});

export default router;
