/* ═══════════════════════════════════════════════════════════════════════════
   AprendeIA - Lógica del frontend
   ═══════════════════════════════════════════════════════════════════════════ */

// ─── Estado global ────────────────────────────────────────────────────────────
const state = {
  token: localStorage.getItem("token") || null,
  usuario: JSON.parse(localStorage.getItem("usuario") || "null"),
  cursos: [],
  cursoActual: null,
  documentos: [],
};

// ─── Referencias DOM ──────────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);
const $$ = (sel) => document.querySelectorAll(sel);

const DOM = {
  authScreen: $("authScreen"),
  appShell: $("appShell"),
  userName: $("userName"),

  // Auth
  loginForm: $("loginForm"),
  registerForm: $("registerForm"),
  loginError: $("loginError"),
  registerError: $("registerError"),

  // Navegación
  navItems: $$(".nav-item[data-view]"),
  views: $$(".view"),

  // Dashboard
  statsGrid: $("statsGrid"),
  statCursos: $("statCursos"),
  statPdfs: $("statPdfs"),
  statEvaluaciones: $("statEvaluaciones"),
  statPromedio: $("statPromedio"),
  lastEvalCard: $("lastEvalCard"),
  lastEvalGrade: $("lastEvalGrade"),
  lastEvalCurso: $("lastEvalCurso"),
  lastEvalScore: $("lastEvalScore"),
  lastEvalDate: $("lastEvalDate"),
  sidebarAvatar: $("sidebarAvatar"),
  courseGrid: $("courseGrid"),
  emptyCourses: $("emptyCourses"),
  createCourseBtn: $("createCourseBtn"),
  courseModal: $("courseModal"),
  courseForm: $("courseForm"),
  courseTitle: $("courseTitle"),
  courseDesc: $("courseDesc"),
  coursePdfLimit: $("coursePdfLimit"),
  cancelCourseBtn: $("cancelCourseBtn"),

  // Curso detalle
  cursoSelector: $("cursoSelector"),
  cursoSelectorGrid: $("cursoSelectorGrid"),
  cursoDetail: $("cursoDetail"),
  cursoBackBtn: $("cursoBackBtn"),
  cursoCreateBtn: $("cursoCreateBtn"),
  cursoEyebrow: $("cursoEyebrow"),
  cursoTitle: $("cursoTitle"),
  cursoDesc: $("cursoDesc"),
  pdfCounter: $("pdfCounter"),
  uploadForm: $("uploadForm"),
  dropzone: $("dropzone"),
  pdfInput: $("pdfInput"),
  uploadBtn: $("uploadBtn"),
  uploadArea: $("uploadArea"),
  uploadQueue: $("uploadQueue"),
  documentosList: $("documentosList"),
  emptyDocs: $("emptyDocs"),

  // Chat
  chatBox: $("chatBox"),
  chatForm: $("chatForm"),
  chatInput: $("chatInput"),
  chatCursoSelect: $("chatCursoSelect"),
  chatBadge: $("chatBadge"),
  chatDocsList: $("chatDocsList"),
  sendButton: document.querySelector(".send-button"),

  // Evaluacion
  evalReviewToggle: $("evalReviewToggle"),
  evalReview: $("evalReview"),
  evalReviewList: $("evalReviewList"),
  evalCursoSelect: $("evalCursoSelect"),
  evalStartBtn: $("evalStartBtn"),
  evalInit: $("evalInit"),
  evalGenerating: $("evalGenerating"),
  evalQuiz: $("evalQuiz"),
  evalResults: $("evalResults"),
  evalProgressFill: $("evalProgressFill"),
  evalCounter: $("evalCounter"),
  evalScore: $("evalScore"),
  evalQuestionText: $("evalQuestionText"),
  evalOptions: $("evalOptions"),
  evalNextBtn: $("evalNextBtn"),
  evalGradeValue: $("evalGradeValue"),
  evalGradeCircle: $("evalGradeCircle"),
  evalResultTitle: $("evalResultTitle"),
  evalCorrectas: $("evalCorrectas"),
  evalTotalPreg: $("evalTotalPreg"),
  evalPercentage: $("evalPercentage"),
  evalBackBtn: $("evalBackBtn"),
  evalList: $("evalList"),
  evalHistorial: $("evalHistorial"),

  // Logout
  logoutBtn: $("logoutBtn"),
};

// ─── Utilidades ───────────────────────────────────────────────────────────────
function apiUrl(path) {
  return `/api${path}`;
}

async function apiFetch(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...options.headers };

  if (state.token) {
    headers["Authorization"] = `Bearer ${state.token}`;
  }

  const res = await fetch(apiUrl(path), { ...options, headers });

  if (res.status === 401 && state.token) {
    logout();
    return null;
  }

  return res.json();
}

function mostrarError(el, msg) {
  el.textContent = msg;
  el.classList.add("visible");
}

function ocultarError(el) {
  el.textContent = "";
  el.classList.remove("visible");
}

function escapar(texto) {
  const div = document.createElement("div");
  div.textContent = texto;
  return div.innerHTML;
}

/**
 * Renderiza texto Markdown a HTML seguro (con fallback si marked no cargó).
 */
function renderMarkdown(text) {
  const html = window.marked
    ? window.marked.parse(text, { breaks: true })
    : text.replace(/\n/g, "<br>");
  return window.DOMPurify ? window.DOMPurify.sanitize(html) : html;
}

// ─── ESTADO DE EVALUACIÓN ───────────────────────────────────────────────────
const evalState = {
  preguntas: [],
  currentIndex: 0,
  evaluacionId: null,
};
const authTabs = $$(".auth-tab");
const authForms = $$(".auth-form");

authTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    authTabs.forEach((t) => t.classList.remove("active"));
    authForms.forEach((f) => f.classList.remove("active"));
    tab.classList.add("active");
    const form = tab.dataset.tab === "login" ? DOM.loginForm : DOM.registerForm;
    form.classList.add("active");
  });
});

DOM.loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  ocultarError(DOM.loginError);

  const email = $("loginEmail").value.trim();
  const password = $("loginPassword").value;

  const data = await apiFetch("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  if (!data) return;

  if (data.error) {
    mostrarError(DOM.loginError, data.error);
    return;
  }

  onLoginSuccess(data);
});

DOM.registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  ocultarError(DOM.registerError);

  const nombre = $("regName").value.trim();
  const email = $("regEmail").value.trim();
  const password = $("regPassword").value;

  const data = await apiFetch("/auth/register", {
    method: "POST",
    body: JSON.stringify({ nombre, email, password }),
  });

  if (!data) return;

  if (data.error) {
    mostrarError(DOM.registerError, data.error);
    return;
  }

  onLoginSuccess(data);
});

function onLoginSuccess(data) {
  state.token = data.token;
  state.usuario = data.usuario;
  localStorage.setItem("token", data.token);
  localStorage.setItem("usuario", JSON.stringify(data.usuario));
  mostrarApp();
}

// ─── Inicialización ──────────────────────────────────────────────────────────
function mostrarApp() {
  DOM.authScreen.style.display = "none";
  DOM.appShell.style.display = "grid";
  DOM.userName.textContent = state.usuario?.nombre || "Usuario";
  // Avatar con iniciales
  const inicial = (state.usuario?.nombre || "U").charAt(0).toUpperCase();
  DOM.sidebarAvatar.textContent = inicial;
  cargarCursos();
  cargarDashboard();
  cargarEvaluaciones();
  // Consultar status para el badge del chat
  fetch("/api/status")
    .then((r) => r.json())
    .then((s) => { window._hasGemini = s?.gemini?.configurado === true; })
    .catch(() => {});
}

function logout() {
  state.token = null;
  state.usuario = null;
  localStorage.removeItem("token");
  localStorage.removeItem("usuario");
  DOM.appShell.style.display = "none";
  DOM.authScreen.style.display = "grid";
  ocultarError(DOM.loginError);
  ocultarError(DOM.registerError);
}

DOM.logoutBtn.addEventListener("click", logout);

// Verificar sesión al cargar
Promise.all([
  // Validar token
  state.token && state.usuario
    ? apiFetch("/auth/me").catch(() => null)
    : Promise.resolve(null),
  // Consultar status del servidor
  fetch("/api/status").then((r) => r.json()).catch(() => null),
]).then(([authData, status]) => {
  if (authData?.usuario) {
    state.usuario = authData.usuario;
    mostrarApp();
  } else if (state.token) {
    logout();
    return;
  }

  // Guardar estado de Gemini para el badge del chat
  window._hasGemini = status?.gemini?.configurado === true;
}).catch(() => {
  if (state.token) logout();
});

// ─── Navegación entre vistas ──────────────────────────────────────────────────
DOM.navItems.forEach((item) => {
  item.addEventListener("click", () => {
    DOM.navItems.forEach((n) => n.classList.remove("active"));
    DOM.views.forEach((v) => v.classList.remove("active-view"));

    item.classList.add("active");
    const view = $(item.dataset.view);
    if (view) view.classList.add("active-view");
  });
});

// ─── CURSOS ──────────────────────────────────────────────────────────────────
async function cargarCursos() {
  const data = await apiFetch("/cursos");

  if (!data) return;

  state.cursos = data.cursos || [];

  renderCursos();
  renderCursoSelector();
  actualizarSelectCursos();
  actualizarSelectEval();
}

function renderCursos() {
  DOM.courseGrid.innerHTML = "";

  if (state.cursos.length === 0) {
    DOM.courseGrid.appendChild(DOM.emptyCourses);
    DOM.emptyCourses.style.display = "block";
    return;
  }

  DOM.emptyCourses.style.display = "none";

  state.cursos.forEach((curso) => {
    const card = document.createElement("article");
    card.className = "course-card";
    card.innerHTML = `
      <h3>${escapar(curso.titulo)}</h3>
      <p>${escapar(curso.descripcion || "Sin descripción")}</p>
      <div class="course-meta">
        <span>📄 ${curso.pdf_count || 0} PDFs</span>
        <span>📅 ${new Date(curso.created_at).toLocaleDateString()}</span>
      </div>
    `;
    card.addEventListener("click", () => abrirCurso(curso.id));
    DOM.courseGrid.appendChild(card);
  });
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
async function cargarDashboard() {
  const data = await apiFetch("/dashboard");
  if (!data) return;

  DOM.statCursos.textContent = data.totalCursos || 0;
  DOM.statPdfs.textContent = data.totalDocumentos || 0;
  DOM.statEvaluaciones.textContent = data.totalEvaluaciones || 0;
  DOM.statPromedio.textContent = (data.promedioNota || 0) + "%";

  // Última evaluación
  if (data.ultimaEvaluacion) {
    DOM.lastEvalCard.style.display = "block";
    const nota = Number(data.ultimaEvaluacion.nota).toFixed(0);
    DOM.lastEvalGrade.textContent = nota + "%";
    DOM.lastEvalGrade.style.color = nota >= 60 ? "var(--green)" : "var(--gold)";
    DOM.lastEvalCurso.textContent = data.ultimaEvaluacion.curso_titulo;
    DOM.lastEvalScore.textContent = `${data.ultimaEvaluacion.respuestas_correctas}/${data.ultimaEvaluacion.total_preguntas} correctas`;
    DOM.lastEvalDate.textContent = new Date(data.ultimaEvaluacion.created_at).toLocaleDateString();
  } else {
    DOM.lastEvalCard.style.display = "none";
  }

}

function renderCursoSelector() {
  const cursos = state.cursos;
  DOM.cursoSelectorGrid.innerHTML = "";
  if (cursos.length === 0) {
    DOM.cursoSelectorGrid.innerHTML = '<p class="muted">No tienes cursos aún. Crea tu primer curso desde aquí.</p>';
    return;
  }
  cursos.forEach((curso) => {
    const card = document.createElement("div");
    card.className = "curso-select-card";
    card.innerHTML = `
      <h4>${escapar(curso.titulo)}</h4>
      <span class="curso-select-count">📄 ${curso.pdf_count || 0} PDFs</span>
    `;
    card.addEventListener("click", () => abrirCurso(curso.id));
    DOM.cursoSelectorGrid.appendChild(card);
  });
}

// ─── Crear curso ──────────────────────────────────────────────────────────────
function abrirModalCurso() {
  DOM.courseForm.reset();
  DOM.courseModal.classList.add("visible");
}

DOM.createCourseBtn.addEventListener("click", abrirModalCurso);
DOM.cursoCreateBtn.addEventListener("click", abrirModalCurso);

DOM.cancelCourseBtn.addEventListener("click", () => {
  DOM.courseModal.classList.remove("visible");
});

DOM.courseModal.addEventListener("click", (e) => {
  if (e.target === DOM.courseModal) DOM.courseModal.classList.remove("visible");
});

DOM.courseForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const titulo = DOM.courseTitle.value.trim();
  const descripcion = DOM.courseDesc.value.trim();
  const pdf_limit = Number(DOM.coursePdfLimit.value) || 20;

  const data = await apiFetch("/cursos", {
    method: "POST",
    body: JSON.stringify({ titulo, descripcion, pdf_limit }),
  });

  if (data?.curso) {
    DOM.courseModal.classList.remove("visible");
    cargarCursos();
    cargarDashboard();
  }
});

// ─── Abrir curso ──────────────────────────────────────────────────────────────
async function abrirCurso(cursoId) {
  const data = await apiFetch(`/cursos/${cursoId}`);

  if (!data?.curso) return;

  state.cursoActual = data.curso;
  state.documentos = data.documentos || [];

  // Mostrar detalle del curso (ocultar selector)
  DOM.cursoSelector.style.display = "none";
  DOM.cursoDetail.style.display = "block";

  // Navegar a la vista curso
  DOM.navItems.forEach((n) => n.classList.remove("active"));
  DOM.views.forEach((v) => v.classList.remove("active-view"));
  document.querySelector('[data-view="curso"]').classList.add("active");
  const cursoView = $("curso");
  if (cursoView) cursoView.classList.add("active-view");

  // Renderizar
  DOM.cursoEyebrow.textContent = "Curso";
  DOM.cursoTitle.textContent = data.curso.titulo;
  DOM.cursoDesc.textContent = data.curso.descripcion || "Sin descripción";

  const total = state.documentos.length;
  const limite = data.curso.pdf_limit;
  DOM.pdfCounter.textContent = `${total} / ${limite} PDFs`;

  renderDocumentos();
}

// ─── Botón volver a selector de cursos ────────────────────────────────────
DOM.cursoBackBtn.addEventListener("click", () => {
  DOM.cursoDetail.style.display = "none";
  DOM.cursoSelector.style.display = "block";
  state.cursoActual = null;
  cargarCursos();
});

function renderDocumentos() {
  DOM.documentosList.innerHTML = `<h3>📄 Documentos del curso</h3>`;

  if (state.documentos.length === 0) {
    DOM.documentosList.appendChild(DOM.emptyDocs);
    DOM.emptyDocs.style.display = "block";
    return;
  }

  DOM.emptyDocs.style.display = "none";

  state.documentos.forEach((doc) => {
    const item = document.createElement("div");
    item.className = "doc-item";
    item.innerHTML = `
      <div class="doc-info">
        <span class="doc-icon">📄</span>
        <div>
          <div class="doc-name">${escapar(doc.titulo)}</div>
          <div class="doc-date">${new Date(doc.created_at).toLocaleDateString()}</div>
        </div>
      </div>
      <button class="btn-danger" data-doc-id="${doc.id}">Eliminar</button>
    `;
    item.querySelector(".btn-danger").addEventListener("click", () => eliminarDocumento(doc.id));
    DOM.documentosList.appendChild(item);
  });
}

// ─── Subir PDFs (múltiples) ───────────────────────────────────────────────────
DOM.dropzone.addEventListener("click", () => DOM.pdfInput.click());

DOM.pdfInput.addEventListener("change", () => {
  mostrarSeleccion();
});

DOM.dropzone.addEventListener("dragover", (e) => {
  e.preventDefault();
  DOM.uploadArea.classList.add("dragover");
});

DOM.dropzone.addEventListener("dragleave", () => {
  DOM.uploadArea.classList.remove("dragover");
});

DOM.dropzone.addEventListener("drop", (e) => {
  e.preventDefault();
  DOM.uploadArea.classList.remove("dragover");
  if (e.dataTransfer.files.length > 0) {
    DOM.pdfInput.files = e.dataTransfer.files;
    mostrarSeleccion();
  }
});

function mostrarSeleccion() {
  const n = DOM.pdfInput.files.length;
  if (n > 0) {
    DOM.uploadBtn.textContent = n === 1 ? "Subir 1 PDF" : `Subir ${n} PDFs`;
    DOM.uploadBtn.style.display = "block";
  } else {
    DOM.uploadBtn.style.display = "none";
  }
}

DOM.uploadForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!state.cursoActual || DOM.pdfInput.files.length === 0) return;

  const files = Array.from(DOM.pdfInput.files);

  // Filtrar archivos que exceden el límite
  const validos = files.filter((f) => f.size <= 20 * 1024 * 1024);
  const omitidos = files.length - validos.length;
  if (validos.length === 0) return;

  // Usar solo los archivos válidos a partir de aquí
  const filesAUpload = validos;

  // Ocultar botón y preparar cola
  DOM.uploadBtn.style.display = "none";
  DOM.uploadQueue.style.display = "block";
  // Construir cola: archivos válidos + omitidos
  let queueHtml = filesAUpload
    .map((f, i) => `
      <div class="queue-item" data-index="${i}">
        <span class="queue-name">${escapar(f.name)}</span>
        <span class="queue-status pending">⏳ Pendiente</span>
      </div>
    `)
    .join("");
  // Agregar archivos omitidos al final (si hay)
  if (omitidos > 0) {
    const omitNames = files.filter((f) => f.size > 20 * 1024 * 1024);
    queueHtml += omitNames
      .map((f) => `
        <div class="queue-item">
          <span class="queue-name">${escapar(f.name)}</span>
          <span class="queue-status error">⏭ Excede 20MB</span>
        </div>
      `)
      .join("");
  }
  DOM.uploadQueue.innerHTML = queueHtml;

  let errores = 0;

  for (let i = 0; i < filesAUpload.length; i++) {
    const file = filesAUpload[i];
    const item = DOM.uploadQueue.querySelector(`[data-index="${i}"]`);
    const statusEl = item.querySelector(".queue-status");

    // Marcar como subiendo
    statusEl.className = "queue-status uploading";
    statusEl.textContent = "⏳ Subiendo...";

    const formData = new FormData();
    formData.append("pdf", file);

    try {
      const res = await fetch(apiUrl(`/cursos/${state.cursoActual.id}/pdf`), {
        method: "POST",
        headers: { Authorization: `Bearer ${state.token}` },
        body: formData,
      });

      const data = await res.json();

      if (data.error) {
        statusEl.className = "queue-status error";
        statusEl.textContent = `❌ ${data.error}`;
        errores++;
      } else {
        statusEl.className = "queue-status done";
        statusEl.textContent = "✅ Subido";
      }
    } catch (_) {
      statusEl.className = "queue-status error";
      statusEl.textContent = "❌ Error de red";
      errores++;
    }
  }

  // Refrescar el detalle del curso al terminar
  await abrirCurso(state.cursoActual.id);

  // Mostrar resumen
  const ok = filesAUpload.length - errores;
  const msg = ok > 0
    ? `✅ ${ok} PDF(s) subidos correctamente` + (errores > 0 ? `. ${errores} error(es).` : "")
    : "❌ No se pudo subir ningún PDF.";

  // Agregar línea de resumen al final de la cola
  const resumen = document.createElement("p");
  resumen.className = "queue-summary";
  resumen.textContent = msg;
  DOM.uploadQueue.appendChild(resumen);

  // Reset input
  DOM.pdfInput.value = "";
  DOM.uploadBtn.style.display = "none";
});

// ─── Eliminar documento ───────────────────────────────────────────────────────
async function eliminarDocumento(docId) {
  if (!confirm("¿Eliminar este documento?")) return;

  const data = await apiFetch(`/cursos/${state.cursoActual.id}/pdf/${docId}`, {
    method: "DELETE",
  });

  if (data?.ok) {
    await abrirCurso(state.cursoActual.id);
  }
}

// ─── EVALUACIÓN ──────────────────────────────────────────────────────────────

// ─── Cargar evaluaciones anteriores ─────────────────────────────────────────
async function cargarEvaluaciones() {
  const data = await apiFetch("/evaluaciones");
  if (!data) return;
  renderEvaluaciones(data.evaluaciones || []);
}

function renderEvaluaciones(lista) {
  DOM.evalList.innerHTML = "";
  if (lista.length === 0) {
    DOM.evalList.innerHTML = '<p class="muted">Aún no has realizado ninguna evaluación.</p>';
    return;
  }
  lista.forEach((ev) => {
    const fecha = new Date(ev.created_at).toLocaleDateString();
    const nota = Number(ev.nota).toFixed(0);
    const aprobado = nota >= 60;
    const item = document.createElement("div");
    item.className = "eval-history-item";
    item.innerHTML = `
      <div class="eval-history-info">
        <strong>${escapar(ev.curso_titulo)}</strong>
        <span class="eval-history-date">${fecha}</span>
      </div>
      <div class="eval-history-grade ${aprobado ? 'pass' : 'fail'}">
        ${nota}% ${aprobado ? '✅' : '📚'}
      </div>
    `;
    DOM.evalList.appendChild(item);
  });
}

// ─── Select de cursos ───────────────────────────────────────────────────────
function actualizarSelectEval() {
  const sel = DOM.evalCursoSelect;
  sel.innerHTML = '<option value="">— Selecciona un curso —</option>';
  state.cursos.forEach((curso) => {
    const opt = document.createElement("option");
    opt.value = curso.id;
    opt.textContent = curso.titulo;
    sel.appendChild(opt);
  });
  DOM.evalStartBtn.disabled = true;
}

DOM.evalCursoSelect.addEventListener("change", () => {
  DOM.evalStartBtn.disabled = !DOM.evalCursoSelect.value;
});

// ─── Iniciar evaluación ──────────────────────────────────────────────────────
DOM.evalStartBtn.addEventListener("click", iniciarEvaluacion);

async function iniciarEvaluacion() {
  const cursoId = DOM.evalCursoSelect.value;
  if (!cursoId) return;

  // Mostrar pantalla de generación
  DOM.evalInit.style.display = "none";
  DOM.evalGenerating.style.display = "block";

  const data = await apiFetch(`/evaluacion/${cursoId}/iniciar`, {
    method: "POST",
  });

  if (!data || data.error) {
    alert(data?.error || "Error al generar evaluación");
    DOM.evalInit.style.display = "block";
    DOM.evalGenerating.style.display = "none";
    return;
  }

  // Si ya habia una evaluacion activa, continuar
  evalState.evaluacionId = data.evaluacionId;

  // Cargar preguntas
  await cargarPreguntas();
}

async function cargarPreguntas() {
  const data = await apiFetch(`/evaluacion/${evalState.evaluacionId}`);
  if (!data || !data.preguntas) {
    alert("Error al cargar preguntas");
    DOM.evalInit.style.display = "block";
    DOM.evalGenerating.style.display = "none";
    return;
  }

  evalState.preguntas = data.preguntas;
  evalState.currentIndex = 0;

  // Si ya estaba completada, ir a resultados
  if (data.evaluacion?.completado) {
    DOM.evalGenerating.style.display = "none";
    mostrarResultados(data.evaluacion);
    return;
  }

  // Ir al quiz
  DOM.evalGenerating.style.display = "none";
  DOM.evalQuiz.style.display = "block";
  mostrarPregunta();
}

// ─── Mostrar pregunta ────────────────────────────────────────────────────────
function mostrarPregunta() {
  const preg = evalState.preguntas[evalState.currentIndex];
  if (!preg) {
    finalizarEvaluacion();
    return;
  }

  const total = evalState.preguntas.length;
  const idx = evalState.currentIndex + 1;

  // Actualizar progreso
  DOM.evalProgressFill.style.width = `${(idx / total) * 100}%`;
  DOM.evalCounter.textContent = `${idx} / ${total}`;

  // Actualizar score
  const correctas = evalState.preguntas.filter((p) => p.es_correcta === true).length;
  DOM.evalScore.textContent = `✅ ${correctas}`;

  // Mostrar pregunta
  DOM.evalQuestionText.textContent = preg.pregunta;
  DOM.evalOptions.innerHTML = "";

  const opciones = Array.isArray(preg.opciones) ? preg.opciones : JSON.parse(preg.opciones);
  opciones.forEach((opt, i) => {
    const letra = String.fromCharCode(65 + i); // A, B, C, D
    const btn = document.createElement("button");
    btn.className = "eval-option";
    btn.dataset.index = i;
    btn.innerHTML = `<span class="eval-option-letter">${letra}</span><span>${escapar(opt)}</span>`;

    // Si ya respondio esta pregunta, marcar la opcion seleccionada
    if (preg.respuesta_usuario !== null && preg.respuesta_usuario !== undefined) {
      if (i === preg.respuesta_usuario) {
        btn.classList.add(preg.es_correcta ? "correct" : "incorrect");
      } else if (i === preg.respuesta_correcta && preg.es_correcta === false) {
        btn.classList.add("correct");
      }
      btn.disabled = true;
    } else {
      btn.addEventListener("click", () => seleccionarOpcion(i, btn));
    }

    DOM.evalOptions.appendChild(btn);
  });

  // Boton siguiente
  DOM.evalNextBtn.textContent = idx < total ? "Siguiente →" : "Finalizar ✓";
  DOM.evalNextBtn.disabled = preg.respuesta_usuario === null || preg.respuesta_usuario === undefined;
}

async function seleccionarOpcion(index, btnElement) {
  const preg = evalState.preguntas[evalState.currentIndex];

  // Deshabilitar todas las opciones
  DOM.evalOptions.querySelectorAll(".eval-option").forEach((b) => (b.disabled = true));

  // Marcar visualmente
  btnElement.classList.add("selected");

  // Enviar al backend
  const result = await apiFetch(`/evaluacion/${evalState.evaluacionId}/responder`, {
    method: "POST",
    body: JSON.stringify({ preguntaId: preg.id, opcionIndex: index }),
  });

  // Actualizar estado local inmediatamente
  const esCorrecta = result?.correcta === true;
  preg.respuesta_usuario = index;
  preg.es_correcta = esCorrecta;

  // Mostrar correcta/incorrecta visualmente
  DOM.evalOptions.querySelectorAll(".eval-option").forEach((b) => {
    const idx = Number(b.dataset.index);
    if (idx === preg.respuesta_correcta) {
      b.classList.add("correct");
    } else if (idx === index && !esCorrecta) {
      b.classList.add("incorrect");
    }
  });

  DOM.evalNextBtn.disabled = false;
}

// ─── Siguiente pregunta o finalizar ─────────────────────────────────────────
DOM.evalNextBtn.addEventListener("click", () => {
  evalState.currentIndex++;
  if (evalState.currentIndex >= evalState.preguntas.length) {
    finalizarEvaluacion();
  } else {
    mostrarPregunta();
  }
});

async function finalizarEvaluacion() {
  const data = await apiFetch(`/evaluacion/${evalState.evaluacionId}/finalizar`, {
    method: "POST",
  });

  if (data?.evaluacion) {
    DOM.evalQuiz.style.display = "none";
    mostrarResultados(data.evaluacion);
    cargarEvaluaciones();
  }
}

function mostrarResultados(eval_) {
  DOM.evalResults.style.display = "block";

  const nota = Number(eval_.nota).toFixed(0);
  DOM.evalGradeValue.textContent = nota;
  DOM.evalCorrectas.textContent = eval_.respuestas_correctas || 0;
  DOM.evalTotalPreg.textContent = eval_.total_preguntas || 20;
  DOM.evalPercentage.textContent = `${nota}%`;

  // Color según nota
  const circle = DOM.evalGradeCircle;
  circle.className = "eval-grade-circle";
  if (nota >= 80) {
    circle.classList.add("grade-excellent");
    DOM.evalResultTitle.textContent = "🌟 ¡Excelente!";
  } else if (nota >= 60) {
    circle.classList.add("grade-good");
    DOM.evalResultTitle.textContent = "👍 Bien hecho";
  } else if (nota >= 40) {
    circle.classList.add("grade-ok");
    DOM.evalResultTitle.textContent = "📚 Sigue estudiando";
  } else {
    circle.classList.add("grade-low");
    DOM.evalResultTitle.textContent = "💪 ¡Ánimo! Repasa el material";
  }

  // Ocultar revisión al mostrar resultados nuevos
  DOM.evalReview.style.display = "none";
  DOM.evalReviewToggle.textContent = "📋 Revisar respuestas";
}

// ─── Revisión detallada de respuestas ─────────────────────────────────────
DOM.evalReviewToggle.addEventListener("click", () => {
  const visible = DOM.evalReview.style.display === "block";
  DOM.evalReview.style.display = visible ? "none" : "block";
  DOM.evalReviewToggle.textContent = visible ? "📋 Revisar respuestas" : "🔽 Ocultar revisión";

  if (!visible) renderReviewDetallada();
});

function renderReviewDetallada() {
  const list = DOM.evalReviewList;
  list.innerHTML = "";

  if (evalState.preguntas.length === 0) {
    list.innerHTML = '<p class="muted">No hay preguntas para revisar.</p>';
    return;
  }

  evalState.preguntas.forEach((preg, i) => {
    const num = i + 1;
    const esCorrecta = preg.es_correcta === true;
    const opciones = Array.isArray(preg.opciones) ? preg.opciones : JSON.parse(preg.opciones);
    const letras = ["A", "B", "C", "D"];

    const item = document.createElement("div");
    item.className = `eval-review-item ${esCorrecta ? "correct" : "incorrect"}`;

    let html = `
      <div class="eval-review-header">
        <span class="eval-review-num">${num}</span>
        <span class="eval-review-badge ${esCorrecta ? "pass" : "fail"}">
          ${esCorrecta ? "✅ Correcta" : "❌ Incorrecta"}
        </span>
      </div>
      <p class="eval-review-question">${escapar(preg.pregunta)}</p>
      <div class="eval-review-opts">
    `;

    opciones.forEach((opt, j) => {
      const esRespuestaUsuario = preg.respuesta_usuario === j;
      const esRespuestaCorrecta = preg.respuesta_correcta === j;
      let cls = "eval-review-opt";
      if (esRespuestaCorrecta) cls += " correct";
      if (esRespuestaUsuario && !esCorrecta) cls += " incorrect";
      if (esRespuestaUsuario && esCorrecta) cls += " selected";

      const icono = esRespuestaCorrecta
        ? "✓"
        : esRespuestaUsuario && !esCorrecta
          ? "✗"
          : "";

      html += `
        <div class="${cls}">
          <span class="eval-review-opt-letter">${letras[j]}</span>
          <span>${escapar(opt)}</span>
          ${icono ? `<span class="eval-review-opt-icon">${icono}</span>` : ""}
        </div>
      `;
    });

    html += `</div>`;
    item.innerHTML = html;
    list.appendChild(item);
  });
}

DOM.evalBackBtn.addEventListener("click", () => {
  DOM.evalResults.style.display = "none";
  DOM.evalInit.style.display = "block";
  evalState.preguntas = [];
  evalState.currentIndex = 0;
  evalState.evaluacionId = null;
  cargarEvaluaciones();
});

// ─── CHAT ─────────────────────────────────────────────────────────────────────
function actualizarSelectCursos() {
  DOM.chatCursoSelect.innerHTML = '<option value="">— Selecciona un curso —</option>';

  state.cursos.forEach((curso) => {
    const opt = document.createElement("option");
    opt.value = curso.id;
    opt.textContent = curso.titulo;
    DOM.chatCursoSelect.appendChild(opt);
  });
}

DOM.chatCursoSelect.addEventListener("change", async () => {
  const cursoId = DOM.chatCursoSelect.value;

  if (!cursoId) {
    DOM.chatInput.disabled = true;
    DOM.sendButton.disabled = true;
    DOM.chatDocsList.innerHTML = '<p class="muted">Selecciona un curso para ver sus documentos</p>';
    return;
  }

  DOM.chatInput.disabled = false;
  DOM.sendButton.disabled = false;

  // Cargar documentos del curso para el sidebar
  const data = await apiFetch(`/cursos/${cursoId}`);
  if (data?.documentos) {
    DOM.chatDocsList.innerHTML = "";
    if (data.documentos.length === 0) {
      DOM.chatDocsList.innerHTML = '<p class="muted">Este curso no tiene documentos</p>';
    } else {
      data.documentos.forEach((doc) => {
        const item = document.createElement("div");
        item.className = "chat-doc-item";
        item.innerHTML = `<span>📄</span> ${escapar(doc.titulo)}`;
        DOM.chatDocsList.appendChild(item);
      });
    }
  }

  // Actualizar badge de Gemini
  DOM.chatBadge.textContent = window._hasGemini ? "Gemini" : "Demo";
});

DOM.chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const cursoId = DOM.chatCursoSelect.value;
  const mensaje = DOM.chatInput.value.trim();

  if (!cursoId || !mensaje) return;

  // Mensaje del usuario
  addMessage(mensaje, "user");
  DOM.chatInput.value = "";

  // Loading
  const loading = addMessage("Pensando...", "ai loading");
  DOM.chatInput.disabled = true;
  DOM.sendButton.disabled = true;

  const data = await apiFetch("/chat", {
    method: "POST",
    body: JSON.stringify({ cursoId: Number(cursoId), mensaje }),
  });

  // Renderizar la respuesta con Markdown
  loading.innerHTML = renderMarkdown(data?.reply || "Lo siento, no pude procesar tu pregunta.");
  loading.classList.remove("loading");

  // Actualizar badge según source
  if (data?.source === "gemini") {
    DOM.chatBadge.textContent = "Gemini";
    DOM.chatBadge.classList.add("gemini");
    window._hasGemini = true;
  } else if (data?.source === "empty") {
    DOM.chatBadge.textContent = "Info";
    DOM.chatBadge.classList.remove("gemini");
  } else {
    DOM.chatBadge.textContent = "Demo";
    DOM.chatBadge.classList.remove("gemini");
  }

  DOM.chatInput.disabled = false;
  DOM.sendButton.disabled = false;
  DOM.chatInput.focus();
});

function addMessage(text, type) {
  const msg = document.createElement("div");
  msg.className = `message ${type}`;

  if (type === "ai" || type === "ai loading") {
    msg.innerHTML = renderMarkdown(text);
  } else {
    // Mensajes de usuario: texto plano (seguridad)
    msg.textContent = text;
  }

  DOM.chatBox.appendChild(msg);
  DOM.chatBox.scrollTop = DOM.chatBox.scrollHeight;
  return msg;
}
