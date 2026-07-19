-- =============================================
-- AprendeIA - Esquema de base de datos MySQL
-- =============================================
-- Crea la base de datos y todas las tablas.
-- Ejecutar: mysql -u root -p < src/migrations/001_schema.sql
-- =============================================

CREATE DATABASE IF NOT EXISTS aprendeia
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE aprendeia;

-- =============================================
-- USUARIOS
-- =============================================
CREATE TABLE IF NOT EXISTS usuarios (
  id          INT           AUTO_INCREMENT PRIMARY KEY,
  nombre      VARCHAR(100)  NOT NULL,
  email       VARCHAR(255)  NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- =============================================
-- CURSOS
-- Cada curso pertenece a un usuario y tiene un
-- límite de PDFs que puede contener (default 20).
-- =============================================
CREATE TABLE IF NOT EXISTS cursos (
  id          INT           AUTO_INCREMENT PRIMARY KEY,
  usuario_id  INT           NOT NULL,
  titulo      VARCHAR(255)  NOT NULL,
  descripcion TEXT,
  pdf_limit   INT           NOT NULL DEFAULT 20,
  created_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =============================================
-- DOCUMENTOS (PDFs parseados)
-- contenido_texto guarda el texto extraído del PDF
-- para usarlo como contexto de la IA.
-- =============================================
CREATE TABLE IF NOT EXISTS documentos (
  id                INT           AUTO_INCREMENT PRIMARY KEY,
  curso_id          INT           NOT NULL,
  titulo            VARCHAR(255)  NOT NULL,
  contenido_texto   LONGTEXT      NOT NULL,
  nombre_archivo    VARCHAR(255)  NOT NULL,
  created_at        TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (curso_id) REFERENCES cursos(id) ON DELETE CASCADE
) ENGINE=InnoDB;
