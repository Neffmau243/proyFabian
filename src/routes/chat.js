const express = require("express");
const { query } = require("../config/db");
const { authMiddleware } = require("../middleware/auth");
const { tieneGeminiValido, crearClienteGemini } = require("../utils/geminiHelper");

const router = express.Router();

const GEMINI_CLIENT = crearClienteGemini();

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";

// ─── POST /api/chat ─────────────────────────────────────────────────────────
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { cursoId, mensaje } = req.body;

    if (!mensaje || !mensaje.trim()) {
      return res.status(400).json({ error: "Escribe una pregunta" });
    }

    if (!cursoId) {
      return res.status(400).json({ error: "Selecciona un curso activo" });
    }

    // 1. Obtener documentos del curso (solo si pertenece al usuario)
    const documentos = await query(
      `SELECT d.titulo, d.contenido_texto
       FROM documentos d
       JOIN cursos c ON c.id = d.curso_id
       WHERE d.curso_id = ? AND c.usuario_id = ?
       ORDER BY d.created_at DESC`,
      [cursoId, req.usuario.id]
    );

    if (documentos.length === 0) {
      const reply = "Este curso aún no tiene documentos. Sube un PDF para que pueda responder preguntas sobre su contenido.";
      return res.json({ source: "empty", reply });
    }

    // 2. Construir contexto distribuyendo equitativamente el presupuesto
    const MAX_CONTEXTO = 12000;
    const presupuestoPorDoc = Math.floor(MAX_CONTEXTO / documentos.length);
    const contexto = documentos
      .map((doc) => `Documento: ${doc.titulo}\n${doc.contenido_texto.slice(0, presupuestoPorDoc)}`)
      .join("\n\n---\n\n");

    // 3. Responder según si hay Gemini o no
    if (!GEMINI_CLIENT) {
      const reply = responderDemo(mensaje, documentos);
      return res.json({ source: "demo", reply });
    }

    const reply = await preguntarGemini(mensaje, contexto);
    res.json({ source: "gemini", reply });
  } catch (error) {
    console.error("Error en chat:", error.message);
    res.status(500).json({ error: "Error al procesar la consulta" });
  }
});

// ─── Gemini ─────────────────────────────────────────────────────────────────
async function preguntarGemini(mensaje, contexto) {
  const prompt = [
    `Tienes el siguiente contenido del curso:\n\n${contexto}`,
    `\n\nPregunta del estudiante: ${mensaje.slice(0, 500)}`,
  ].join("");

  try {
    const response = await GEMINI_CLIENT.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      systemInstruction: {
        role: "user",
        parts: [{
          text: [
            "Eres un tutor que responde usando el contenido del curso.",
            "Responde de forma completa y directa, sin cortarte a mitad.",
            "Cita el nombre del documento del que sacas la informacion.",
            "Si preguntan para que sirve o como usarlo, explica el proposito y da ejemplos practicos.",
            "Usa solo texto plano: sin ###, **, ---, >, viñetas ni listas.",
            "Responde en español.",
          ].join(" "),
        }],
      },
      config: {
        temperature: 0.4,
        maxOutputTokens: 2048,
        topP: 0.9,
      },
    });

    // Verificar si la respuesta fue truncada
    const candidate = response?.candidates?.[0];
    if (candidate?.finishReason && candidate.finishReason !== "STOP") {
      console.warn(`Respuesta truncada: finishReason=${candidate.finishReason}`);
    }

    const text =
      typeof response?.text === "string" && response.text.trim()
        ? response.text.trim()
        : candidate?.content?.parts
            ?.map((p) => p.text || "")
            .join("\n")
            .trim();

    return text || "No pude generar una respuesta.";
  } catch (error) {
    console.error("Gemini error:", error.message);
    return "Lo siento, Gemini no está disponible ahora. Intenta de nuevo más tarde.";
  }
}

// ─── Modo demo (sin Gemini) ─────────────────────────────────────────────────
function responderDemo(mensaje, documentos) {
  const texto = mensaje.toLowerCase();

  // Buscar en los documentos información relevante
  for (const doc of documentos) {
    const contenido = doc.contenido_texto.toLowerCase();
    const palabras = texto.split(/\s+/).filter((p) => p.length > 3);

    const coincidencias = palabras.filter((p) => contenido.includes(p));
    if (coincidencias.length >= Math.min(palabras.length * 0.3, 2)) {
      const extracto = doc.contenido_texto.slice(0, 400);
      return `Según el documento "${doc.titulo}":\n\n${extracto}\n\n¿Quieres saber algo más específico?`;
    }
  }

  return `Tengo ${documentos.length} documento(s) en este curso. Pregúntame algo específico sobre su contenido y te responderé basado en ellos.`;
}

module.exports = router;
