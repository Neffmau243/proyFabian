const express = require("express");
const { testConnection } = require("../config/db");
const { tieneGeminiValido } = require("../utils/geminiHelper");

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

module.exports = router;
