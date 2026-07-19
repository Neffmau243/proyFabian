const { GoogleGenAI } = require("@google/genai");
require("dotenv").config();

const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
console.log(`Modelo a probar: ${model}`);

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

async function main() {
  const response = await ai.models.generateContent({
    model,
    contents: "Di solamente: Hola",
  });

  console.log("Respuesta:", response.text);
}

main().catch((e) => {
  console.error("ERROR:", e.message || e);
  process.exit(1);
});