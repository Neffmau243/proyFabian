const express = require("express");
const path = require("path");

require("dotenv").config();

const PORT = Number(process.env.PORT) || 3000;

// ─── Inicializar Express ─────────────────────────────────────────────────────
const app = express();

// Middlewares globales
app.use(express.json({ limit: "1mb" }));

// Servir archivos estáticos del frontend
app.use(express.static(path.join(__dirname, "public")));

// ─── Rutas de la API ─────────────────────────────────────────────────────────
app.use("/api/auth", require("./src/routes/auth"));
app.use("/api/cursos", require("./src/routes/cursos"));
app.use("/api/chat", require("./src/routes/chat"));
app.use("/api/status", require("./src/routes/status"));
app.use("/api/evaluacion", require("./src/routes/evaluacion"));
app.use("/api/dashboard", require("./src/routes/dashboard"));

// ─── Fallback SPA: cualquier ruta que no sea API → index.html ───────────────
app.use((req, res) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ error: "Endpoint no encontrado" });
  }
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ─── Migraciones y arranque ──────────────────────────────────────────────────
async function iniciar() {
  const { runMigrations } = require("./src/config/db");
  await runMigrations();
  startServer(PORT);
}

iniciar().catch((error) => {
  console.error("❌", error.message);
  process.exit(1);
});

function startServer(port, attempt = 1) {
  const server = app.listen(port, () => {
    console.log(`\n  🚀 AprendeIA corriendo en http://localhost:${port}\n`);
  });

  server.on("error", (error) => {
    if (error.code === "EADDRINUSE" && attempt < 10) {
      console.warn(`  ⚠️  Puerto ${port} ocupado, probando ${port + 1}...`);
      startServer(port + 1, attempt + 1);
    } else {
      console.error("  ❌ No se pudo iniciar:", error.message);
      process.exit(1);
    }
  });
}

// ─── Utilidades ──────────────────────────────────────────────────────────────
// (vacío por ahora — se usa dotenv para las variables de entorno)
