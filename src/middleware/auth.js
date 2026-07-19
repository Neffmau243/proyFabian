const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "aprendeia-dev-secret-2026";

if (!process.env.JWT_SECRET) {
  console.warn("  ⚠️  JWT_SECRET no configurado. Usando clave por defecto (solo para desarrollo).");
}

/**
 * Middleware que verifica el token JWT en el header Authorization.
 * Si es válido, añade req.usuario con { id, email, nombre }.
 */
function authMiddleware(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token requerido" });
  }

  const token = header.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.usuario = { id: decoded.id, email: decoded.email, nombre: decoded.nombre };
    next();
  } catch (error) {
    return res.status(401).json({ error: "Token inválido o expirado" });
  }
}

/**
 * Genera un token JWT para un usuario.
 */
function generarToken(usuario) {
  return jwt.sign(
    { id: usuario.id, email: usuario.email, nombre: usuario.nombre },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

module.exports = { authMiddleware, generarToken };
