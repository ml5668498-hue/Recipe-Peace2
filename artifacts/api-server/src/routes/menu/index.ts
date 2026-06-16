import { Router, type IRouter } from "express";
import OpenAI from "openai";
import { GenerateMenuBody, GenerateMenuResponse } from "@workspace/api-zod";
import { fallbackGenerateMenu } from "../../lib/fallback-generator";

const router: IRouter = Router();

function getGroqClient(): OpenAI | null {
  if (!process.env.GROQ_API_KEY) return null;
  return new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: "https://api.groq.com/openai/v1",
  });
}

const quickOptionLabels: Record<string, string> = {
  "10min": "todas las comidas en máximo 10 minutos de preparación",
  "20min": "todas las comidas en máximo 20 minutos de preparación",
  economico: "ingredientes económicos y accesibles",
  familiar: "adecuado para toda la familia incluyendo niños",
};

router.post("/menu/generate", async (req, res): Promise<void> => {
  const parsed = GenerateMenuBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { type, quickOption } = parsed.data;
  const groq = getGroqClient();

  if (!groq) {
    req.log.info("No GROQ_API_KEY — using fallback menu generator (free mode)");
    res.json(fallbackGenerateMenu(type, quickOption));
    return;
  }

  const isWeek = type === "week";
  const daysCount = isWeek ? 7 : 1;
  const quickLabel = quickOption ? quickOptionLabels[quickOption] : null;
  const quickConstraint = quickLabel ? `Restricción especial: ${quickLabel}.` : "";
  const dayNames = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

  try {
    const prompt = `Eres un nutricionista especializado en alimentación anti ansiedad. Crea un menú ${isWeek ? "semanal completo (7 días)" : "para un día"} equilibrado, simple y calmante. Para cada comida incluye la receta completa con ingredientes exactos y pasos de preparación.
${quickConstraint}

Responde ÚNICAMENTE con un JSON válido (sin texto adicional) con este formato exacto:

{
  "days": [
    {
      "dayLabel": ${isWeek ? '"Lunes"' : "null"},
      "breakfast": {
        "name": "Nombre del plato",
        "mainIngredients": ["ingrediente1", "ingrediente2"],
        "ingredients": ["100g ingrediente1", "2 unidades ingrediente2", "1 cdta ingrediente3"],
        "steps": ["Paso 1 de preparación.", "Paso 2 de preparación.", "Paso 3 de preparación."],
        "estimatedTime": "10 minutos",
        "difficulty": "Fácil",
        "antiAnxietyTip": "Consejo anti ansiedad específico para este plato.",
        "calmMessage": "Mensaje reconfortante breve."
      },
      "lunch": { "name": "...", "mainIngredients": ["..."], "ingredients": ["..."], "steps": ["..."], "estimatedTime": "...", "difficulty": "Fácil", "antiAnxietyTip": "...", "calmMessage": "..." },
      "snack": { "name": "...", "mainIngredients": ["..."], "ingredients": ["..."], "steps": ["..."], "estimatedTime": "...", "difficulty": "Fácil", "antiAnxietyTip": "...", "calmMessage": "..." },
      "dinner": { "name": "...", "mainIngredients": ["..."], "ingredients": ["..."], "steps": ["..."], "estimatedTime": "...", "difficulty": "Fácil", "antiAnxietyTip": "...", "calmMessage": "..." },
      "optionalSnack": { "name": "...", "mainIngredients": ["..."], "ingredients": ["..."], "steps": ["..."], "estimatedTime": "...", "difficulty": "Fácil", "antiAnxietyTip": "...", "calmMessage": "..." }
    }${isWeek ? " ... repite para los 7 días" : ""}
  ]
}

Reglas:
- difficulty debe ser exactamente "Fácil", "Medio" o "Difícil"
- ingredients: lista completa con cantidades exactas (ej: "2 huevos", "200g arroz", "1 cdta sal")
- steps: 3 a 5 pasos claros y concisos
- antiAnxietyTip: consejo específico del beneficio anti ansiedad de ese plato
- Cada calmMessage debe ser único, breve y reconfortante
- Genera exactamente ${daysCount} día${daysCount > 1 ? "s" : ""}
- Los días deben ser: ${isWeek ? dayNames.join(", ") : "null (solo un día)"}`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: isWeek ? 8000 : 2500,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) throw new Error("Empty response from Groq");

    const rawData = JSON.parse(content);
    const validated = GenerateMenuResponse.safeParse(rawData);
    if (!validated.success) {
      req.log.warn({ errors: validated.error.message }, "Groq response did not match schema — falling back");
      res.json(fallbackGenerateMenu(type, quickOption));
      return;
    }

    res.json(validated.data);
  } catch (err) {
    req.log.warn({ err }, "Groq call failed — falling back to internal menu");
    res.json(fallbackGenerateMenu(type, quickOption));
  }
});

export default router;
