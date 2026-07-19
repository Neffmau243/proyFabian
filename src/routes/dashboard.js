const express = require("express");
const { query, queryOne } = require("../config/db");
const { authMiddleware } = require("../middleware/auth");

const router = express.Router();
router.use(authMiddleware);

// ─── GET /api/dashboard ──────────────────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const uid = req.usuario.id;

    // Total de cursos
    const { totalCursos } = await queryOne(
      "SELECT COUNT(*) AS totalCursos FROM cursos WHERE usuario_id = ?",
      [uid]
    );

    // Total de documentos (PDFs) en todos los cursos del usuario
    const { totalDocumentos } = await queryOne(
      `SELECT COUNT(*) AS totalDocumentos
       FROM documentos d
       JOIN cursos c ON c.id = d.curso_id
       WHERE c.usuario_id = ?`,
      [uid]
    );

    // Evaluaciones completadas
    const { totalEvaluaciones } = await queryOne(
      "SELECT COUNT(*) AS totalEvaluaciones FROM evaluaciones WHERE usuario_id = ? AND completado = TRUE",
      [uid]
    );

    // Promedio de notas
    const { promedioNota } = await queryOne(
      "SELECT COALESCE(ROUND(AVG(nota), 1), 0) AS promedioNota FROM evaluaciones WHERE usuario_id = ? AND completado = TRUE",
      [uid]
    );

    // Última evaluación
    const ultimaEvaluacion = await queryOne(
      `SELECT e.nota, e.total_preguntas, e.respuestas_correctas, e.created_at, c.titulo AS curso_titulo
       FROM evaluaciones e
       JOIN cursos c ON c.id = e.curso_id
       WHERE e.usuario_id = ? AND e.completado = TRUE
       ORDER BY e.created_at DESC
       LIMIT 1`,
      [uid]
    );

    // Cursos con su conteo de PDFs (para dashboard)
    const cursos = await query(
      `SELECT c.id, c.titulo,
              (SELECT COUNT(*) FROM documentos d WHERE d.curso_id = c.id) AS pdf_count
       FROM cursos c
       WHERE c.usuario_id = ?
       ORDER BY pdf_count DESC`,
      [uid]
    );

    res.json({
      totalCursos: Number(totalCursos),
      totalDocumentos: Number(totalDocumentos),
      totalEvaluaciones: Number(totalEvaluaciones),
      promedioNota: Number(promedioNota),
      ultimaEvaluacion,
      cursos,
    });
  } catch (error) {
    console.error("Error en dashboard:", error.message);
    res.status(500).json({ error: "Error al obtener datos del dashboard" });
  }
});

module.exports = router;
