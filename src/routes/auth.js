const express = require("express");
const bcrypt = require("bcryptjs");
const { query, queryOne, execute } = require("../config/db");
const { authMiddleware, generarToken } = require("../middleware/auth");

const router = express.Router();

// ─── POST /api/auth/register ────────────────────────────────────────────────
router.post("/register", async (req, res) => {
  try {
    const { nombre, email, password } = req.body;

    // Validaciones
    if (!nombre || !email || !password) {
      return res.status(400).json({ error: "Todos los campos son obligatorios" });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "La contraseña debe tener al menos 6 caracteres" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Email no válido" });
    }

    // Verificar si el email ya existe
    const existente = await queryOne("SELECT id FROM usuarios WHERE email = ?", [email]);
    if (existente) {
      return res.status(409).json({ error: "El email ya está registrado" });
    }

    // Crear usuario
    const passwordHash = await bcrypt.hash(password, 10);
    const result = await execute(
      "INSERT INTO usuarios (nombre, email, password_hash) VALUES (?, ?, ?)",
      [nombre.trim(), email.trim().toLowerCase(), passwordHash]
    );

    const usuario = { id: result.insertId, nombre: nombre.trim(), email: email.trim().toLowerCase() };
    const token = generarToken(usuario);

    res.status(201).json({ token, usuario });
  } catch (error) {
    console.error("Error en registro:", error.message);
    res.status(500).json({ error: "Error al registrar usuario" });
  }
});

// ─── POST /api/auth/login ───────────────────────────────────────────────────
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email y contraseña requeridos" });
    }

    const usuario = await queryOne(
      "SELECT id, nombre, email, password_hash FROM usuarios WHERE email = ?",
      [email.trim().toLowerCase()]
    );

    if (!usuario) {
      return res.status(401).json({ error: "Credenciales inválidas" });
    }

    const passwordValida = await bcrypt.compare(password, usuario.password_hash);
    if (!passwordValida) {
      return res.status(401).json({ error: "Credenciales inválidas" });
    }

    const payload = { id: usuario.id, nombre: usuario.nombre, email: usuario.email };
    const token = generarToken(payload);

    res.json({ token, usuario: payload });
  } catch (error) {
    console.error("Error en login:", error.message);
    res.status(500).json({ error: "Error al iniciar sesión" });
  }
});

// ─── GET /api/auth/me ───────────────────────────────────────────────────────
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const usuario = await queryOne(
      "SELECT id, nombre, email, created_at FROM usuarios WHERE id = ?",
      [req.usuario.id]
    );

    if (!usuario) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    res.json({ usuario });
  } catch (error) {
    console.error("Error en /me:", error.message);
    res.status(500).json({ error: "Error al obtener usuario" });
  }
});

module.exports = router;
