const express = require("express");
const { query, queryOne, execute } = require("../config/db");
const { authMiddleware } = require("../middleware/auth");
const { crearClienteGemini } = require("../utils/geminiHelper");

const router = express.Router();

router.use(authMiddleware);

const GEMINI_CLIENT = crearClienteGemini();
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";
const TOTAL_PREGUNTAS = 20;

// ─── POST /api/evaluacion/:cursoId/iniciar ──────────────────────────────────
router.post("/:cursoId/iniciar", async (req, res) => {
  try {
    // 1. Verificar que el curso existe y pertenece al usuario
    const curso = await queryOne(
      "SELECT id, titulo FROM cursos WHERE id = ? AND usuario_id = ?",
      [req.params.cursoId, req.usuario.id]
    );
    if (!curso) {
      return res.status(404).json({ error: "Curso no encontrado" });
    }

    // 2. Verificar que el curso tiene documentos con contenido
    const docs = await query(
      "SELECT contenido_texto FROM documentos WHERE curso_id = ? AND contenido_texto IS NOT NULL AND contenido_texto != '' LIMIT 5",
      [curso.id]
    );
    if (docs.length === 0) {
      return res.status(400).json({ error: "Este curso no tiene documentos con contenido. Sube PDFs primero." });
    }

    // 3. Verificar si ya hay una evaluacion activa (no completada)
    const activa = await queryOne(
      "SELECT id FROM evaluaciones WHERE curso_id = ? AND usuario_id = ? AND completado = FALSE",
      [curso.id, req.usuario.id]
    );
    if (activa) {
      return res.json({ evaluacionId: activa.id, continuar: true });
    }

    // 4. Generar preguntas con Gemini
    if (!GEMINI_CLIENT) {
      return res.status(400).json({ error: "Se necesita Gemini configurado para generar evaluaciones. Configura GEMINI_API_KEY en .env" });
    }

    const contexto = docs.map((d) => d.contenido_texto.slice(0, 8000)).join("\n\n---\n\n").slice(0, 30000);

    const prompt = [
      `Eres un profesor. Genera exactamente ${TOTAL_PREGUNTAS} preguntas de opcion multiple (4 opciones cada una) basadas en el siguiente contenido del curso.`,
      `\n\nCONTENIDO DEL CURSO:\n${contexto}`,
      `\n\nINSTRUCCIONES:`,
      `- Genera ${TOTAL_PREGUNTAS} preguntas en ESPAÑOL.`,
      `- Cada pregunta debe tener 4 opciones (A, B, C, D).`,
      `- Indica el indice de la opcion correcta (0 para la primera, 1 para la segunda, etc.).`,
      `- Las preguntas deben evaluar comprension, no solo memorizacion.`,
      `- Devuelve SOLO un JSON array valido, sin markdown, sin formato extra:`,
      `[`,
      `  { "pregunta": "Texto?", "opciones": ["A", "B", "C", "D"], "correcta": 0 }`,
      `]`,
    ].join("\n");

    const response = await GEMINI_CLIENT.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { temperature: 0.5, maxOutputTokens: 8192, topP: 0.9 },
    });

    const rawText = response?.text || response?.candidates?.[0]?.content?.parts?.map(p => p.text).join("") || "";
    if (!rawText.trim()) {
      return res.status(500).json({ error: "Gemini no genero preguntas. Intenta de nuevo." });
    }

    // 5. Parsear el JSON
    let preguntas;
    try {
      // Limpiar posibles caracteres markdown alrededor del JSON
      const jsonStr = rawText.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
      preguntas = JSON.parse(jsonStr);
      if (!Array.isArray(preguntas) || preguntas.length === 0) {
        throw new Error("Formato invalido");
      }
      // Limitar a TOTAL_PREGUNTAS
      preguntas = preguntas.slice(0, TOTAL_PREGUNTAS);
    } catch (_) {
      return res.status(500).json({ error: "Error al procesar las preguntas generadas. Intenta de nuevo." });
    }

    // 6. Guardar evaluacion en DB
    const result = await execute(
      "INSERT INTO evaluaciones (usuario_id, curso_id, titulo, total_preguntas) VALUES (?, ?, ?, ?)",
      [req.usuario.id, curso.id, curso.titulo, preguntas.length]
    );
    const evaluacionId = result.insertId;

    // 7. Guardar cada pregunta en DB
    for (const p of preguntas) {
      await execute(
        "INSERT INTO preguntas_evaluacion (evaluacion_id, pregunta, opciones, respuesta_correcta) VALUES (?, ?, ?, ?)",
        [evaluacionId, p.pregunta, JSON.stringify(p.opciones), p.correcta]
      );
    }

    res.status(201).json({ evaluacionId, total: preguntas.length });
  } catch (error) {
    console.error("Error iniciando evaluacion:", error.message);
    res.status(500).json({ error: "Error al generar la evaluacion" });
  }
});

// ─── GET /api/evaluacion/:evalId ────────────────────────────────────────────
router.get("/:evalId", async (req, res) => {
  try {
    const eval_ = await queryOne(
      "SELECT * FROM evaluaciones WHERE id = ? AND usuario_id = ?",
      [req.params.evalId, req.usuario.id]
    );
    if (!eval_) {
      return res.status(404).json({ error: "Evaluacion no encontrada" });
    }

    const preguntas = await query(
      "SELECT id, pregunta, opciones, respuesta_correcta, respuesta_usuario, es_correcta FROM preguntas_evaluacion WHERE evaluacion_id = ? ORDER BY id ASC",
      [eval_.id]
    );

    // Parsear opciones de JSON string a array
    const preguntasParseadas = preguntas.map((p) => ({
      ...p,
      opciones: typeof p.opciones === "string" ? JSON.parse(p.opciones) : p.opciones,
    }));

    res.json({ evaluacion: eval_, preguntas: preguntasParseadas });
  } catch (error) {
    console.error("Error obteniendo evaluacion:", error.message);
    res.status(500).json({ error: "Error al obtener evaluacion" });
  }
});

// ─── POST /api/evaluacion/:evalId/responder ────────────────────────────────
router.post("/:evalId/responder", async (req, res) => {
  try {
    const { preguntaId, opcionIndex } = req.body;

    // Verificar que la evaluacion existe y pertenece al usuario
    const eval_ = await queryOne(
      "SELECT id, completado FROM evaluaciones WHERE id = ? AND usuario_id = ?",
      [req.params.evalId, req.usuario.id]
    );
    if (!eval_) {
      return res.status(404).json({ error: "Evaluacion no encontrada" });
    }
    if (eval_.completado) {
      return res.status(400).json({ error: "Evaluacion ya completada" });
    }

    // Verificar que la pregunta pertenece a esta evaluacion
    const pregunta = await queryOne(
      "SELECT id, respuesta_correcta FROM preguntas_evaluacion WHERE id = ? AND evaluacion_id = ?",
      [preguntaId, eval_.id]
    );
    if (!pregunta) {
      return res.status(404).json({ error: "Pregunta no encontrada" });
    }

    // Validar indice de opcion
    const idx = Number(opcionIndex);
    if (isNaN(idx) || idx < 0 || idx > 3) {
      return res.status(400).json({ error: "Opcion invalida" });
    }

    const esCorrecta = idx === pregunta.respuesta_correcta;

    await execute(
      "UPDATE preguntas_evaluacion SET respuesta_usuario = ?, es_correcta = ? WHERE id = ?",
      [idx, esCorrecta, pregunta.id]
    );

    res.json({ correcta: esCorrecta });
  } catch (error) {
    console.error("Error respondiendo pregunta:", error.message);
    res.status(500).json({ error: "Error al guardar respuesta" });
  }
});

// ─── POST /api/evaluacion/:evalId/finalizar ────────────────────────────────
router.post("/:evalId/finalizar", async (req, res) => {
  try {
    const eval_ = await queryOne(
      "SELECT id, total_preguntas, completado FROM evaluaciones WHERE id = ? AND usuario_id = ?",
      [req.params.evalId, req.usuario.id]
    );
    if (!eval_) {
      return res.status(404).json({ error: "Evaluacion no encontrada" });
    }
    if (eval_.completado) {
      // Si ya esta completada, devolver los resultados actuales
      const yaCompletada = await queryOne(
        "SELECT id, total_preguntas, respuestas_correctas, nota, created_at FROM evaluaciones WHERE id = ?",
        [eval_.id]
      );
      return res.json({ evaluacion: yaCompletada });
    }

    // Contar respuestas correctas
    const stats = await queryOne(
      "SELECT COUNT(*) AS total_respondidas, SUM(CASE WHEN es_correcta = TRUE THEN 1 ELSE 0 END) AS correctas FROM preguntas_evaluacion WHERE evaluacion_id = ? AND respuesta_usuario IS NOT NULL",
      [eval_.id]
    );

    const respondidas = Number(stats?.total_respondidas || 0);
    const correctas = Number(stats?.correctas || 0);
    const nota = eval_.total_preguntas > 0
      ? Math.round((correctas / eval_.total_preguntas) * 100 * 100) / 100
      : 0;

    await execute(
      "UPDATE evaluaciones SET respuestas_correctas = ?, nota = ?, completado = TRUE WHERE id = ?",
      [correctas, nota, eval_.id]
    );

    res.json({
      evaluacion: {
        id: eval_.id,
        total_preguntas: eval_.total_preguntas,
        respuestas_correctas: correctas,
        respondidas,
        nota,
      },
    });
  } catch (error) {
    console.error("Error finalizando evaluacion:", error.message);
    res.status(500).json({ error: "Error al finalizar evaluacion" });
  }
});

// ─── GET /api/evaluaciones ──────────────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const lista = await query(
      `SELECT e.*, c.titulo AS curso_titulo
       FROM evaluaciones e
       JOIN cursos c ON c.id = e.curso_id
       WHERE e.usuario_id = ?
       ORDER BY e.created_at DESC`,
      [req.usuario.id]
    );

    res.json({ evaluaciones: lista });
  } catch (error) {
    console.error("Error listando evaluaciones:", error.message);
    res.status(500).json({ error: "Error al obtener evaluaciones" });
  }
});

module.exports = router;
