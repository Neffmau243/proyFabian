# AprendeIA - Plataforma de aprendizaje con IA

AprendeIA es un prototipo web para un trabajo de Interaccion Hombre-Maquina. Es una plataforma educativa donde los estudiantes suben sus propios PDFs, hacen preguntas a un tutor IA, y ponen a prueba sus conocimientos con evaluaciones inteligentes generadas automaticamente.

---

## ✨ Funcionalidades

### 📊 Dashboard
- Panel principal con **estadisticas dinamicas**: total de cursos, PDFs subidos, examenes completados y promedio de notas.
- Muestra la **ultima evaluacion** realizada con puntaje y fecha.
- Acceso rapido a todos los cursos.

### 📖 Cursos
- **CRUD completo**: crear, ver y eliminar cursos.
- Limite configurable de PDFs por curso (1-100).
- Vista de selector de cursos con tarjetas visuales.
- Al seleccionar un curso se accede al detalle con upload y documentos.

### 📄 Subida de PDFs (multiple)
- Arrastra y suelta **varios PDFs a la vez**.
- **Cola de procesamiento visual**: cada archivo muestra su estado individual (pendiente → subiendo → subido/error).
- **Filtro inteligente**: archivos que exceden 20MB se marcan como omitidos sin bloquear el resto.
- **Extraccion automatica de texto** con `pdf-parse` — el contenido se guarda en la base de datos.
- El PDF se parsea **una sola vez** al subir. Nunca se vuelve a leer.

### 💬 Tutor IA (Chat)
- Dos modos de funcionamiento:
  - **Modo Gemini**: responde usando el contenido extraido de tus PDFs como contexto.
  - **Modo Demo**: respuestas basicas por coincidencia de palabras (sin API key).
- Renderizado Markdown completo con **sanitizado XSS** (DOMPurify).
- Interfaz de chat con burbujas, animaciones y diseno responsive.

### 📝 Evaluacion Inteligente
- Genera **20 preguntas de opcion multiple** (4 opciones c/u) usando Gemini, basadas en el contenido del curso.
- Interfaz de quiz con **progreso visual**, puntaje en vivo y retroalimentacion inmediata.
- Al finalizar: **nota, estadisticas y revision detallada** pregunta por pregunta.
  - Marca en verde la respuesta correcta.
  - Marca en rojo la respuesta del usuario si fallo.
- Historial persistente de todas las evaluaciones realizadas.

### 🔐 Autenticacion
- Registro e inicio de sesion con JWT.
- Proteccion de rutas en toda la API.
- Avatar con iniciales del usuario en el sidebar.
- Sesion persistente en localStorage.

---

## 🚀 Requisitos

| Requisito | Version | Detalle |
|-----------|---------|--------|
| Node.js | 18+ | Entorno de ejecucion |
| MySQL | 8+ | Base de datos local o remota |
| Gemini API key | Opcional | Solo para modo IA completo |

---

## ⚡ Como ejecutar

```bash
# 1. Clonar el proyecto
git clone <repo-url>
cd aprendeia

# 2. Crear la base de datos
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS aprendeia"

# 3. Configurar variables de entorno
cp .env.example .env
# Edita .env con tus credenciales:
#   DB_USER=root
#   DB_PASSWORD=tu_contraseña
#   GEMINI_API_KEY=AIza... (opcional)

# 4. Instalar dependencias
npm install

# 5. Iniciar el servidor
npm start

# 6. Abrir en el navegador
# http://localhost:3000
```

> Las tablas se crean **automaticamente** al arrancar el servidor. No necesitas ejecutar migraciones manuales.

---

## 📁 Estructura del proyecto

```
📁 aprendeia/
├── server.js                       # Punto de entrada
├── src/
│   ├── config/
│   │   └── db.js                   # Pool MySQL + auto-migraciones
│   ├── middleware/
│   │   └── auth.js                 # JWT middleware
│   ├── routes/
│   │   ├── auth.js                 # Registro, login, /me
│   │   ├── cursos.js               # CRUD cursos + subida PDF
│   │   ├── chat.js                 # Chat con Gemini/Demo
│   │   ├── evaluacion.js           # Evaluaciones con Gemini
│   │   ├── dashboard.js            # Estadisticas del dashboard
│   │   └── status.js               # Endpoint de estado
│   └── utils/
│       └── geminiHelper.js         # Validacion de API key
├── public/
│   ├── index.html                  # Frontend SPA
│   ├── script.js                   # Logica del frontend
│   └── styles.css                  # Estilos con design system
├── uploads/                        # Archivos temporales
├── .env.example                    # Template de configuracion
├── package.json
└── README.md
```

---

## 🗄️ Base de datos (auto-migracion)

El servidor crea las siguientes tablas al arrancar:

| Tabla | Descripcion |
|-------|-------------|
| `usuarios` | Usuarios registrados (nombre, email, password_hash) |
| `cursos` | Cursos por usuario (titulo, descripcion, pdf_limit) |
| `documentos` | PDFs subidos con texto extraido (contenido_texto) |
| `evaluaciones` | Evaluaciones realizadas (nota, total preguntas) |
| `preguntas_evaluacion` | Preguntas generadas con respuestas y opciones |

Todas las tablas usan **InnoDB** con **foreign keys y ON DELETE CASCADE**. No necesitas crear nada manualmente.

---

## 🐳 Solucion de problemas

| Problema | Solucion |
|----------|----------|
| Puerto 3000 ocupado | El servidor prueba automaticamente 3001, 3002... hasta 10 intentos |
| Forzar puerto especifico | `PORT=3001 npm start` |
| Sigue apareciendo "Demo" | Verifica que `.env` tenga una clave Gemini real (no `TU_CLAVE_AQUI`) |
| Error de conexion MySQL | Verifica que MySQL este corriendo y las credenciales en `.env` sean correctas |
| Cache del navegador | Haz Ctrl+Shift+R (hard refresh) o agrega `?v=2` al final de la URL |

### 🔑 Obtener API key de Gemini

```text
https://aistudio.google.com/app/apikey
```

No pegues tu API key dentro de `index.html` ni `script.js`. Este proyecto la protege en el backend mediante variables de entorno.

---

## 🧠 Relacion con Interaccion Hombre-Maquina

El prototipo aplica principios de IHM:

- **Navegacion intuitiva**: sidebar con iconos, breadcrumbs e indicador visual de pagina activa.
- **Retroalimentacion inmediata**: respuestas del chat en vivo, estados de carga animados, cola de subida con progreso.
- **Carga cognitiva reducida**: informacion organizada en secciones, dashboard con metricas clave, tarjetas visuales.
- **Control del usuario**: cada estudiante gestiona sus propios cursos, documentos y evaluaciones.
- **Tolerancia al error**: validacion de formularios, confirmacion antes de eliminar, filtro de archivos grandes.
- **Consistencia**: design system con variables CSS, botones y componentes reutilizables.
- **Accesibilidad**: buen contraste, textos claros, etiquetas semantica, diseno responsive (3 breakpoints).

---

## 📝 Explicacion corta para defender el proyecto

> AprendeIA es una plataforma educativa donde los estudiantes suben sus propios materiales (PDFs), un tutor con IA responde preguntas basandose exclusivamente en ese contenido, y evaluaciones inteligentes generadas automaticamente miden su progreso. El proyecto aplica principios de Interaccion Hombre-Maquina como navegacion intuitiva, retroalimentacion inmediata, control del usuario sobre sus datos y carga cognitiva reducida.