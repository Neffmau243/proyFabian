const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { PDFParse } = require("pdf-parse");
const { query, queryOne, execute } = require("../config/db");
const { authMiddleware } = require("../middleware/auth");

const router = express.Router();

// ─── Configuración de multer ─────────────────────────────────────────────────
const UPLOAD_DIR = path.join(__dirname, "..", "..", "uploads");

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (_req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname) || ".pdf";
    cb(null, `pdf-${unique}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      return cb(new Error("Solo se permiten archivos PDF"));
    }
    cb(null, true);
  },
});

// ─── Todos los endpoints requieren autenticación ─────────────────────────────
router.use(authMiddleware);

// ─── GET /api/cursos — Listar cursos del usuario ────────────────────────────
router.get("/", async (req, res) => {
  try {
    const cursos = await query(
      `SELECT c.*,
              (SELECT COUNT(*) FROM documentos d WHERE d.curso_id = c.id) AS pdf_count
       FROM cursos c
       WHERE c.usuario_id = ?
       ORDER BY c.created_at DESC`,
      [req.usuario.id]
    );

    res.json({ cursos });
  } catch (error) {
    console.error("Error listando cursos:", error.message);
    res.status(500).json({ error: "Error al obtener cursos" });
  }
});

// ─── GET /api/cursos/:id — Detalle del curso (con documentos) ───────────────
router.get("/:id", async (req, res) => {
  try {
    const curso = await queryOne(
      "SELECT * FROM cursos WHERE id = ? AND usuario_id = ?",
      [req.params.id, req.usuario.id]
    );

    if (!curso) {
      return res.status(404).json({ error: "Curso no encontrado" });
    }

    const documentos = await query(
      "SELECT id, titulo, nombre_archivo, created_at FROM documentos WHERE curso_id = ? ORDER BY created_at DESC",
      [curso.id]
    );

    res.json({ curso, documentos });
  } catch (error) {
    console.error("Error obteniendo curso:", error.message);
    res.status(500).json({ error: "Error al obtener curso" });
  }
});

// ─── POST /api/cursos — Crear un curso ─────────────────────────────────────
router.post("/", async (req, res) => {
  try {
    const { titulo, descripcion, pdf_limit } = req.body;

    if (!titulo || !titulo.trim()) {
      return res.status(400).json({ error: "El título es obligatorio" });
    }

    const limit = Math.min(Math.max(Number(pdf_limit) || 20, 1), 100);

    const result = await execute(
      "INSERT INTO cursos (usuario_id, titulo, descripcion, pdf_limit) VALUES (?, ?, ?, ?)",
      [req.usuario.id, titulo.trim(), (descripcion || "").trim(), limit]
    );

    const curso = {
      id: result.insertId,
      usuario_id: req.usuario.id,
      titulo: titulo.trim(),
      descripcion: (descripcion || "").trim(),
      pdf_limit: limit,
    };

    res.status(201).json({ curso });
  } catch (error) {
    console.error("Error creando curso:", error.message);
    res.status(500).json({ error: "Error al crear curso" });
  }
});

// ─── PUT /api/cursos/:id — Actualizar curso ─────────────────────────────────
router.put("/:id", async (req, res) => {
  try {
    const curso = await queryOne(
      "SELECT id FROM cursos WHERE id = ? AND usuario_id = ?",
      [req.params.id, req.usuario.id]
    );

    if (!curso) {
      return res.status(404).json({ error: "Curso no encontrado" });
    }

    const { titulo, descripcion, pdf_limit } = req.body;
    const updates = [];
    const params = [];

    if (titulo && titulo.trim()) {
      updates.push("titulo = ?");
      params.push(titulo.trim());
    }
    if (descripcion !== undefined) {
      updates.push("descripcion = ?");
      params.push(descripcion.trim());
    }
    if (pdf_limit !== undefined) {
      const limit = Math.min(Math.max(Number(pdf_limit), 1), 100);
      updates.push("pdf_limit = ?");
      params.push(limit);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: "Nada que actualizar" });
    }

    params.push(curso.id);
    await execute(`UPDATE cursos SET ${updates.join(", ")} WHERE id = ?`, params);

    const actualizado = await queryOne("SELECT * FROM cursos WHERE id = ?", [curso.id]);
    res.json({ curso: actualizado });
  } catch (error) {
    console.error("Error actualizando curso:", error.message);
    res.status(500).json({ error: "Error al actualizar curso" });
  }
});

// ─── DELETE /api/cursos/:id — Eliminar curso ────────────────────────────────
router.delete("/:id", async (req, res) => {
  try {
    const result = await execute(
      "DELETE FROM cursos WHERE id = ? AND usuario_id = ?",
      [req.params.id, req.usuario.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Curso no encontrado" });
    }

    res.json({ ok: true });
  } catch (error) {
    console.error("Error eliminando curso:", error.message);
    res.status(500).json({ error: "Error al eliminar curso" });
  }
});

// ─── POST /api/cursos/:id/pdf — Subir y parsear PDF ────────────────────────
router.post("/:id/pdf", upload.single("pdf"), async (req, res) => {
  let filePath = null;

  try {
    const curso = await queryOne(
      "SELECT id, pdf_limit FROM cursos WHERE id = ? AND usuario_id = ?",
      [req.params.id, req.usuario.id]
    );

    if (!curso) {
      return res.status(404).json({ error: "Curso no encontrado" });
    }

    // Verificar límite de PDFs
    const countResult = await query(
      "SELECT COUNT(*) AS total FROM documentos WHERE curso_id = ?",
      [curso.id]
    );
    const pdfCount = countResult[0]?.total || 0;

    if (pdfCount >= curso.pdf_limit) {
      return res.status(400).json({
        error: `Límite alcanzado: máximo ${curso.pdf_limit} PDFs por curso`,
      });
    }

    if (!req.file) {
      return res.status(400).json({ error: "Selecciona un archivo PDF" });
    }

    filePath = req.file.path;

    // Extraer texto del PDF
    const pdfBuffer = fs.readFileSync(filePath);
    const pdf = new PDFParse({ data: new Uint8Array(pdfBuffer) });
    await pdf.load();
    const pdfData = await pdf.getText();
    const contenidoTexto = pdfData.text || "";
    await pdf.destroy();

    if (!contenidoTexto.trim()) {
      fs.unlinkSync(filePath);
      filePath = null;
      return res.status(400).json({ error: "No se pudo extraer texto del PDF" });
    }

    const nombreOriginal = req.file.originalname.replace(/\.pdf$/i, "");

    // Guardar en DB
    const result = await execute(
      "INSERT INTO documentos (curso_id, titulo, contenido_texto, nombre_archivo) VALUES (?, ?, ?, ?)",
      [curso.id, nombreOriginal, contenidoTexto, req.file.filename]
    );

    // Eliminar archivo temporal
    fs.unlinkSync(filePath);
    filePath = null;

    const documento = {
      id: result.insertId,
      curso_id: curso.id,
      titulo: nombreOriginal,
      nombre_archivo: req.file.filename,
    };

    res.status(201).json({ documento });
  } catch (error) {
    // Limpiar archivo temporal si hay error
    if (filePath && fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch (_) { /* ignore */ }
    }

    if (error.message === "Solo se permiten archivos PDF") {
      return res.status(400).json({ error: error.message });
    }

    console.error("Error subiendo PDF:", error.message);
    res.status(500).json({ error: "Error al procesar el PDF" });
  }
});

// ─── DELETE /api/cursos/:id/pdf/:pdfId — Eliminar un documento ─────────────
router.delete("/:id/pdf/:pdfId", async (req, res) => {
  try {
    // Verificar que el curso pertenece al usuario
    const curso = await queryOne(
      "SELECT id FROM cursos WHERE id = ? AND usuario_id = ?",
      [req.params.id, req.usuario.id]
    );

    if (!curso) {
      return res.status(404).json({ error: "Curso no encontrado" });
    }

    const result = await execute(
      "DELETE FROM documentos WHERE id = ? AND curso_id = ?",
      [req.params.pdfId, req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Documento no encontrado" });
    }

    res.json({ ok: true });
  } catch (error) {
    console.error("Error eliminando documento:", error.message);
    res.status(500).json({ error: "Error al eliminar documento" });
  }
});

module.exports = router;
