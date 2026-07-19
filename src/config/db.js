const mysql = require("mysql2/promise");

let pool = null;

/**
 * Retorna el pool de conexiones MySQL.
 * Si no existe, lo crea con variables de entorno.
 */
function getPool() {
  if (pool) return pool;

  pool = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "aprendeia",
    waitForConnections: true,
    connectionLimit: 10,
    charset: "utf8mb4",
  });

  return pool;
}

/**
 * Ejecuta una query parametrizada.
 */
async function query(sql, params) {
  const conn = getPool();
  const [rows] = await conn.execute(sql, params);
  return rows;
}

/**
 * Obtiene una sola fila (o null).
 */
async function queryOne(sql, params) {
  const rows = await query(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Ejecuta una query sin retorno (INSERT, UPDATE, DELETE).
 */
async function execute(sql, params) {
  const conn = getPool();
  const [result] = await conn.execute(sql, params);
  return result;
}

/**
 * Verifica la conexión a la base de datos.
 */
async function testConnection() {
  try {
    const conn = getPool();
    await conn.getConnection();
    console.log("✅ Conexión a MySQL establecida");
    return true;
  } catch (error) {
    console.error("❌ Error conectando a MySQL:", error.message);
    return false;
  }
}

/**
 * Crea las tablas si no existen (auto-migración).
 */
async function runMigrations() {
  const crearUsuarios = `
    CREATE TABLE IF NOT EXISTS usuarios (
      id            INT           AUTO_INCREMENT PRIMARY KEY,
      nombre        VARCHAR(100)  NOT NULL,
      email         VARCHAR(255)  NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      created_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB
  `;

  const crearCursos = `
    CREATE TABLE IF NOT EXISTS cursos (
      id          INT           AUTO_INCREMENT PRIMARY KEY,
      usuario_id  INT           NOT NULL,
      titulo      VARCHAR(255)  NOT NULL,
      descripcion TEXT,
      pdf_limit   INT           NOT NULL DEFAULT 20,
      created_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
    ) ENGINE=InnoDB
  `;

  const crearDocumentos = `
    CREATE TABLE IF NOT EXISTS documentos (
      id                INT           AUTO_INCREMENT PRIMARY KEY,
      curso_id          INT           NOT NULL,
      titulo            VARCHAR(255)  NOT NULL,
      contenido_texto   LONGTEXT      NOT NULL,
      nombre_archivo    VARCHAR(255)  NOT NULL,
      created_at        TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (curso_id) REFERENCES cursos(id) ON DELETE CASCADE
    ) ENGINE=InnoDB
  `;

  const crearEvaluaciones = `
    CREATE TABLE IF NOT EXISTS evaluaciones (
      id                INT           AUTO_INCREMENT PRIMARY KEY,
      usuario_id        INT           NOT NULL,
      curso_id          INT           NOT NULL,
      titulo            VARCHAR(255)  NOT NULL DEFAULT '',
      total_preguntas   INT           NOT NULL DEFAULT 20,
      respuestas_correctas INT       NOT NULL DEFAULT 0,
      nota              DECIMAL(5,2)  NOT NULL DEFAULT 0,
      completado        BOOLEAN       NOT NULL DEFAULT FALSE,
      created_at        TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
      FOREIGN KEY (curso_id)   REFERENCES cursos(id)   ON DELETE CASCADE
    ) ENGINE=InnoDB
  `;

  const crearPreguntas = `
    CREATE TABLE IF NOT EXISTS preguntas_evaluacion (
      id                  INT           AUTO_INCREMENT PRIMARY KEY,
      evaluacion_id       INT           NOT NULL,
      pregunta            TEXT          NOT NULL,
      opciones            JSON          NOT NULL,
      respuesta_correcta  INT           NOT NULL,
      respuesta_usuario   INT           DEFAULT NULL,
      es_correcta         BOOLEAN       DEFAULT NULL,
      created_at          TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (evaluacion_id) REFERENCES evaluaciones(id) ON DELETE CASCADE
    ) ENGINE=InnoDB
  `;

  try {
    await execute(crearUsuarios);
    await execute(crearCursos);
    await execute(crearDocumentos);
    await execute(crearEvaluaciones);
    await execute(crearPreguntas);
    console.log("✅ Migraciones ejecutadas (tablas listas)");
  } catch (error) {
    console.error("❌ Error en migraciones:", error.message);
    throw error;
  }
}

module.exports = { getPool, query, queryOne, execute, testConnection, runMigrations };
