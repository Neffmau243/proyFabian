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
  cursoEyebrow: $("cursoEyebrow"),
  cursoTitle: $("cursoTitle"),
  cursoDesc: $("cursoDesc"),
  pdfCounter: $("pdfCounter"),
  uploadForm: $("uploadForm"),
  dropzone: $("dropzone"),
  pdfInput: $("pdfInput"),
  uploadBtn: $("uploadBtn"),
  uploadArea: $("uploadArea"),
  uploadProgress: $("uploadProgress"),
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

// ─── Auth ────────────────────────────────────────────────────────────────────
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
  cargarCursos();
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
  actualizarSelectCursos();
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

// ─── Crear curso ──────────────────────────────────────────────────────────────
DOM.createCourseBtn.addEventListener("click", () => {
  DOM.courseForm.reset();
  DOM.courseModal.classList.add("visible");
});

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
  }
});

// ─── Abrir curso ──────────────────────────────────────────────────────────────
async function abrirCurso(cursoId) {
  const data = await apiFetch(`/cursos/${cursoId}`);

  if (!data?.curso) return;

  state.cursoActual = data.curso;
  state.documentos = data.documentos || [];

  // Mostrar vista de curso
  DOM.navItems.forEach((n) => n.classList.remove("active"));
  DOM.views.forEach((v) => v.classList.remove("active-view"));
  document.querySelector('[data-view="curso"]').classList.add("active");
  DOM.views.forEach((v) => { if (v.id === "curso") v.classList.add("active-view"); });

  // Renderizar
  DOM.cursoEyebrow.textContent = "Curso";
  DOM.cursoTitle.textContent = data.curso.titulo;
  DOM.cursoDesc.textContent = data.curso.descripcion || "Sin descripción";

  const total = state.documentos.length;
  const limite = data.curso.pdf_limit;
  DOM.pdfCounter.textContent = `${total} / ${limite} PDFs`;

  renderDocumentos();
}

function renderDocumentos() {
  DOM.documentosList.innerHTML = `<h3>Documentos del curso</h3>`;

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

// ─── Subir PDF ────────────────────────────────────────────────────────────────
DOM.dropzone.addEventListener("click", () => DOM.pdfInput.click());

DOM.pdfInput.addEventListener("change", () => {
  DOM.uploadBtn.style.display = DOM.pdfInput.files.length > 0 ? "block" : "none";
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
    DOM.uploadBtn.style.display = "block";
  }
});

DOM.uploadForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!state.cursoActual) return;

  const file = DOM.pdfInput.files[0];
  if (!file) return;

  // Validar tamaño
  if (file.size > 20 * 1024 * 1024) {
    alert("El PDF supera los 20 MB");
    return;
  }

  // Mostrar progreso
  DOM.uploadBtn.style.display = "none";
  DOM.uploadProgress.style.display = "block";

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
      alert(data.error);
    } else {
      // Recargar curso
      await abrirCurso(state.cursoActual.id);
    }
  } catch (error) {
    alert("Error al subir el PDF");
  } finally {
    DOM.uploadProgress.style.display = "none";
    DOM.uploadBtn.style.display = "none";
    DOM.pdfInput.value = "";
  }
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
