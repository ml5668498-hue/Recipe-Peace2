import { Router, type IRouter } from "express";
import OpenAI from "openai";
import { GenerateMenuBody, GenerateMenuResponse } from "@workspace/api-zod";

const router: IRouter = Router();

function getOpenAI(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set");
  }
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
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
  const isWeek = type === "week";
  const daysCount = isWeek ? 7 : 1;
  const quickLabel = quickOption ? quickOptionLabels[quickOption] : null;
  const quickConstraint = quickLabel ? `Restricción especial: ${quickLabel}.` : "";
  const dayNames = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

  try {
    const openai = getOpenAI();

    const daysArray = isWeek
      ? dayNames.map((d) => `{ "dayLabel": "${d}", "breakfast": ..., "lunch": ..., "snack": ..., "dinner": ..., "optionalSnack": ... }`)
      : [`{ "dayLabel": null, "breakfast": ..., "lunch": ..., "snack": ..., "dinner": ..., "optionalSnack": ... }`];

    const prompt = `Eres un nutricionista especializado en alimentación anti ansiedad. Crea un menú ${isWeek ? "semanal completo (7 días)" : "para un día"} equilibrado, simple y calmante.
${quickConstraint}

Responde ÚNICAMENTE con un JSON válido (sin texto adicional) con este formato:

{
  "days": [
    {
      "dayLabel": ${isWeek ? '"Lunes"' : "null"},
      "breakfast": {
        "name": "Nombre del desayuno",
        "mainIngredients": ["ingrediente1", "ingrediente2"],
        "estimatedTime": "10 minutos",
        "difficulty": "Fácil",
        "calmMessage": "Mensaje breve y calmante"
      },
      "lunch": { ...igual que breakfast... },
      "snack": { ...igual que breakfast... },
      "dinner": { ...igual que breakfast... },
      "optionalSnack": { ...igual que breakfast... }
    }${isWeek ? ",\n    { ... 6 días más ... }" : ""}
  ]
}

Reglas:
- difficulty debe ser exactamente "Fácil", "Medio" o "Difícil"
- Cada calmMessage debe ser único, breve (máximo 1 oración) y reconfortante
- Las comidas deben ser variadas y no repetirse en la semana
- Usa ingredientes cotidianos y accesibles en Latinoamérica
- El desayuno debe ser nutritivo y sin complicaciones
- La cena debe ser liviana y fácil de digerir
- Genera exactamente ${daysCount} día${daysCount > 1 ? "s" : ""}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: isWeek ? 6000 : 1500,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      res.status(500).json({ error: "No se pudo generar la respuesta" });
      return;
    }

    const rawData = JSON.parse(content);
    const validated = GenerateMenuResponse.safeParse(rawData);
    if (!validated.success) {
      req.log.warn({ errors: validated.error.message }, "AI menu response did not match schema");
      res.status(500).json({ error: "Formato de respuesta inválido" });
      return;
    }

    res.json(validated.data);
  } catch (err) {
    req.log.error({ err }, "Error generating menu");
    if (err instanceof Error && err.message === "OPENAI_API_KEY is not set") {
      res.status(500).json({ error: "API key de OpenAI no configurada" });
      return;
    }
    res.status(500).json({ error: "Error al generar el menú. Por favor intenta de nuevo." });
  }
});

export default router;
