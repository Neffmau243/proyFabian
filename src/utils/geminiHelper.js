/**
 * Utilidades compartidas para validar/configurar Gemini.
 */

const { GoogleGenAI } = require("@google/genai");

/**
 * Verifica si la API key de Gemini es válida (no es un placeholder).
 */
function tieneGeminiValido(key) {
  if (!key) return false;

  const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, "");
  const placeholders = ["tuclave", "yourapikeyhere", "placeholder", "tuclavedegeminiaqui"];

  return !placeholders.some((c) => normalized.includes(c));
}

/**
 * Retorna una instancia de GoogleGenAI si la key es válida, o null si no.
 */
function crearClienteGemini() {
  const key = String(process.env.GEMINI_API_KEY || "").trim();
  if (!tieneGeminiValido(key)) return null;
  return new GoogleGenAI({ apiKey: key });
}

module.exports = { tieneGeminiValido, crearClienteGemini };
