import { Router, type IRouter } from "express";
import OpenAI from "openai";
import { GenerateRecipesBody, GenerateRecipesResponse } from "@workspace/api-zod";
import { fallbackGenerateRecipes } from "../../lib/fallback-generator";

const router: IRouter = Router();

const OBJETIVO_LABELS: Record<string, string> = {
  rapido: "rápida de preparar (máximo 15 minutos)",
  economico: "económica, con ingredientes baratos y accesibles",
  familiar: "apta para toda la familia, incluyendo niños",
  saludable: "nutritiva y saludable, balanceada",
  sin_harinas: "sin harinas ni cereales",
  sin_azucar: "sin azúcar ni endulzantes",
  para_ansiedad: "especialmente reconfortante y anti ansiedad, con texturas cálidas",
  cena_liviana: "liviana para cenar, baja en calorías y fácil de digerir",
};

function getGroqClient(): OpenAI | null {
  if (!process.env.GROQ_API_KEY) return null;
  return new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: "https://api.groq.com/openai/v1",
  });
}

router.post("/recipes/generate", async (req, res): Promise<void> => {
  const parsed = GenerateRecipesBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { ingredients, objetivo } = parsed.data;
  const groq = getGroqClient();

  if (!groq) {
    req.log.info("No GROQ_API_KEY — using internal recipe database (free mode)");
    const result = fallbackGenerateRecipes(ingredients);
    res.json(result);
    return;
  }

  const objetivoClause = objetivo && OBJETIVO_LABELS[objetivo]
    ? `\nObjetivo especial del usuario: cada receta debe ser ${OBJETIVO_LABELS[objetivo]}.`
    : "";

  try {
    const prompt = `Eres un chef amable especializado en cocina anti ansiedad alimentaria. El usuario tiene estos ingredientes disponibles: ${ingredients.join(", ")}.${objetivoClause}

Genera exactamente 3 recetas usando principalmente esos ingredientes. Responde ÚNICAMENTE con un JSON válido (sin texto adicional) con este formato exacto:

{
  "recipes": [
    {
      "name": "Nombre de la receta",
      "usedIngredients": ["ingrediente1", "ingrediente2"],
      "steps": ["Paso 1", "Paso 2", "Paso 3"],
      "estimatedTime": "20 minutos",
      "difficulty": "Fácil",
      "antiAnxietyTip": "Un consejo breve y calmante relacionado con esta receta"
    }
  ]
}

Reglas:
- difficulty debe ser exactamente "Fácil", "Medio" o "Difícil"
- Los pasos deben ser simples, claros y sin tecnicismos
- El antiAnxietyTip debe ser cálido, breve y reconfortante
- Máximo 6 pasos por receta${objetivo ? "\n- Respeta estrictamente el objetivo especial indicado en las 3 recetas" : ""}`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) throw new Error("Empty response from Groq");

    const rawData = JSON.parse(content);
    const validated = GenerateRecipesResponse.safeParse(rawData);
    if (!validated.success) {
      req.log.warn({ errors: validated.error.message }, "Groq response did not match schema — falling back");
      res.json(fallbackGenerateRecipes(ingredients));
      return;
    }

    res.json(validated.data);
  } catch (err) {
    req.log.warn({ err }, "Groq call failed — falling back to internal DB");
    res.json(fallbackGenerateRecipes(ingredients));
  }
});

export default router;
