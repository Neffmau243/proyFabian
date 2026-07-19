const express = require("express");
const { GoogleGenAI } = require("@google/genai");
const { testConnection } = require("../config/db");

const router = express.Router();

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";

// ─── GET /api/status ─────────────────────────────────────────────────────────
router.get("/", async (req, res) => {
  const geminiKey = String(process.env.GEMINI_API_KEY || "").trim();
  const geminiValida = tieneGeminiValido(geminiKey);

  let dbConectada = false;
  try {
    dbConectada = await testConnection();
  } catch (_) {
    // Si falla, dbConectada queda false
  }

  res.json({
    gemini: {
      configurado: geminiValida,
      modelo: geminiValida ? GEMINI_MODEL : null,
    },
    db: {
      conectada: dbConectada,
      nombre: process.env.DB_NAME || "aprendeia",
    },
    version: "1.0.0",
  });
});

function tieneGeminiValido(key) {
  if (!key) return false;

  const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, "");
  const placeholders = ["tuclave", "yourapikeyhere", "placeholder", "tuclavedegeminiaqui"];

  return !placeholders.some((c) => normalized.includes(c));
}

module.exports = router;
