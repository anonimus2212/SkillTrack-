// =====================================================
// SKILLTRACK - App Router & Core
// =====================================================

const App = (() => {
  let currentPage = 'dashboard';
  let sessionListener = null;

  // ── INIT ───────────────────────────────────────────
  async function init() {
    const session = await Auth.getSession();
    if (session) {
      showApp();
      await navigateTo('dashboard');
    } else {
      showAuth();
    }

    sessionListener = Auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN') {
        showApp();
        await navigateTo('dashboard');
      } else if (event === 'SIGNED_OUT') {
        showAuth();
      } else if (event === 'PASSWORD_RECOVERY') {
        showPasswordRecovery();
      }
    });
  }

  // ── SHOW AUTH / APP ────────────────────────────────
  function showAuth() {
    document.getElementById('auth-container').style.display = 'flex';
    document.getElementById('app-container').style.display = 'none';
    renderAuthPage();
  }

  function showApp() {
    document.getElementById('auth-container').style.display = 'none';
    document.getElementById('app-container').style.display = 'flex';
    renderSidebar();
  }

  // ── AUTH PAGE ──────────────────────────────────────
  let authMode = 'login';

  function renderAuthPage() {
    const el = document.getElementById('auth-container');
    el.innerHTML = `
      <div class="auth-card">
        <div class="auth-logo">
          <div class="auth-logo-icon">🚀</div>
          <span class="auth-logo-text">SkillTrack</span>
        </div>
        <div class="auth-tab">
          <button id="tab-login" class="${authMode === 'login' ? 'active' : ''}" onclick="App.switchAuthMode('login')">Iniciar sesión</button>
          <button id="tab-register" class="${authMode === 'register' ? 'active' : ''}" onclick="App.switchAuthMode('register')">Registrarse</button>
        </div>
        <div id="auth-form-area"></div>
        <div style="text-align:center;margin-top:1rem;">
          <button class="link-btn" onclick="App.showForgotPassword()">¿Olvidaste tu contraseña?</button>
        </div>
      </div>`;
    renderAuthForm();
  }

  function renderAuthForm() {
    const el = document.getElementById('auth-form-area');
    if (!el) return;

    if (authMode === 'login') {
      el.innerHTML = `
        <div id="auth-alert"></div>
        <div class="form-group">
          <label for="auth-email">Correo electrónico</label>
          <input id="auth-email" type="email" placeholder="tu@correo.com" autocomplete="email">
        </div>
        <div class="form-group">
          <label for="auth-password">Contraseña</label>
          <input id="auth-password" type="password" placeholder="••••••••" autocomplete="current-password">
        </div>
        <button class="btn btn-primary btn-full" id="auth-submit" onclick="App.handleLogin()">Iniciar sesión</button>`;
    } else {
      el.innerHTML = `
        <div id="auth-alert"></div>
        <div class="form-group">
          <label for="auth-nombre">Nombre</label>
          <input id="auth-nombre" type="text" placeholder="Tu nombre completo" autocomplete="name">
        </div>
        <div class="form-group">
          <label for="auth-email">Correo electrónico</label>
          <input id="auth-email" type="email" placeholder="tu@correo.com" autocomplete="email">
        </div>
        <div class="form-group">
          <label for="auth-password">Contraseña</label>
          <input id="auth-password" type="password" placeholder="Mínimo 6 caracteres" autocomplete="new-password">
        </div>
        <div class="form-group">
          <label for="auth-password2">Confirmar contraseña</label>
          <input id="auth-password2" type="password" placeholder="Repite tu contraseña" autocomplete="new-password">
        </div>
        <button class="btn btn-primary btn-full" id="auth-submit" onclick="App.handleRegister()">Crear cuenta</button>`;
    }

    // Enter key support
    el.querySelectorAll('input').forEach(inp => {
      inp.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          document.getElementById('auth-submit').click();
        }
      });
    });
  }

  function switchAuthMode(mode) {
    authMode = mode;
    document.getElementById('tab-login')?.classList.toggle('active', mode === 'login');
    document.getElementById('tab-register')?.classList.toggle('active', mode === 'register');
    renderAuthForm();
  }

  async function handleLogin() {
    const email = document.getElementById('auth-email')?.value.trim();
    const password = document.getElementById('auth-password')?.value;
    const alertEl = document.getElementById('auth-alert');
    const btn = document.getElementById('auth-submit');

    alertEl.innerHTML = '';
    if (!email || !password) {
      alertEl.innerHTML = `<div class="alert alert-error">Por favor completa todos los campos.</div>`;
      return;
    }

    UI.setButtonLoading(btn, true);
    try {
      await Auth.login(email, password);
    } catch (err) {
      UI.setButtonLoading(btn, false);
      alertEl.innerHTML = `<div class="alert alert-error">${authErrorMsg(err.message)}</div>`;
    }
  }

  async function handleRegister() {
    const nombre = document.getElementById('auth-nombre')?.value.trim();
    const email = document.getElementById('auth-email')?.value.trim();
    const password = document.getElementById('auth-password')?.value;
    const password2 = document.getElementById('auth-password2')?.value;
    const alertEl = document.getElementById('auth-alert');
    const btn = document.getElementById('auth-submit');

    alertEl.innerHTML = '';

    if (!nombre || !email || !password) {
      alertEl.innerHTML = `<div class="alert alert-error">Por favor completa todos los campos.</div>`; return;
    }
    if (password.length < 6) {
      alertEl.innerHTML = `<div class="alert alert-error">La contraseña debe tener al menos 6 caracteres.</div>`; return;
    }
    if (password !== password2) {
      alertEl.innerHTML = `<div class="alert alert-error">Las contraseñas no coinciden.</div>`; return;
    }

    UI.setButtonLoading(btn, true);
    try {
      await Auth.register(nombre, email, password);
      alertEl.innerHTML = `<div class="alert alert-success">✅ Cuenta creada. Revisa tu correo para confirmar tu cuenta si es necesario, luego inicia sesión.</div>`;
      UI.setButtonLoading(btn, false);
      setTimeout(() => switchAuthMode('login'), 2500);
    } catch (err) {
      UI.setButtonLoading(btn, false);
      alertEl.innerHTML = `<div class="alert alert-error">${authErrorMsg(err.message)}</div>`;
    }
  }

  function showForgotPassword() {
    const m = UI.modal({
      title: 'Recuperar contraseña',
      body: `
        <p style="font-size:0.875rem;color:var(--text-secondary);margin-bottom:1rem;">Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.</p>
        <div id="forgot-alert"></div>
        <div class="form-group">
          <label for="forgot-email">Correo electrónico</label>
          <input id="forgot-email" type="email" placeholder="tu@correo.com">
        </div>`,
      footer: `
        <button class="btn btn-ghost" id="forgot-cancel">Cancelar</button>
        <button class="btn btn-primary" id="forgot-send">Enviar enlace</button>`
    });

    m.el.querySelector('#forgot-cancel').addEventListener('click', m.close);
    m.el.querySelector('#forgot-send').addEventListener('click', async () => {
      const email = m.el.querySelector('#forgot-email').value.trim();
      const alertEl = m.el.querySelector('#forgot-alert');
      const btn = m.el.querySelector('#forgot-send');

      if (!email) { alertEl.innerHTML = `<div class="alert alert-error">Ingresa tu correo.</div>`; return; }

      UI.setButtonLoading(btn, true);
      try {
        await Auth.sendPasswordReset(email);
        alertEl.innerHTML = `<div class="alert alert-success">✅ Enlace enviado. Revisa tu correo.</div>`;
        UI.setButtonLoading(btn, false);
        btn.disabled = true;
      } catch (err) {
        UI.setButtonLoading(btn, false);
        alertEl.innerHTML = `<div class="alert alert-error">${authErrorMsg(err.message)}</div>`;
      }
    });

    m.el.querySelector('#forgot-email').focus();
  }

  function showPasswordRecovery() {
    const el = document.getElementById('auth-container');
    el.style.display = 'flex';
    document.getElementById('app-container').style.display = 'none';

    el.innerHTML = `
      <div class="auth-card">
        <div class="auth-logo">
          <div class="auth-logo-icon">🚀</div>
          <span class="auth-logo-text">SkillTrack</span>
        </div>
        <h3 style="margin-bottom:1rem;">Nueva contraseña</h3>
        <div id="recovery-alert"></div>
        <div class="form-group">
          <label for="new-pass">Nueva contraseña</label>
          <input id="new-pass" type="password" placeholder="Mínimo 6 caracteres" autocomplete="new-password">
        </div>
        <div class="form-group">
          <label for="new-pass2">Confirmar contraseña</label>
          <input id="new-pass2" type="password" placeholder="Repite la contraseña" autocomplete="new-password">
        </div>
        <button class="btn btn-primary btn-full" id="recovery-btn">Actualizar contraseña</button>
      </div>`;

    document.getElementById('recovery-btn').addEventListener('click', async () => {
      const p1 = document.getElementById('new-pass').value;
      const p2 = document.getElementById('new-pass2').value;
      const alertEl = document.getElementById('recovery-alert');
      const btn = document.getElementById('recovery-btn');

      if (p1.length < 6) { alertEl.innerHTML = `<div class="alert alert-error">Mínimo 6 caracteres.</div>`; return; }
      if (p1 !== p2) { alertEl.innerHTML = `<div class="alert alert-error">Las contraseñas no coinciden.</div>`; return; }

      UI.setButtonLoading(btn, true);
      const { error } = await db.auth.updateUser({ password: p1 });
      if (error) {
        UI.setButtonLoading(btn, false);
        alertEl.innerHTML = `<div class="alert alert-error">${UI.escHtml(error.message)}</div>`;
      } else {
        alertEl.innerHTML = `<div class="alert alert-success">✅ Contraseña actualizada. Redirigiendo…</div>`;
        setTimeout(() => showApp() || navigateTo('dashboard'), 1500);
      }
    });
  }

  function authErrorMsg(msg) {
    if (msg?.includes('Invalid login credentials')) return 'Correo o contraseña incorrectos.';
    if (msg?.includes('User already registered')) return 'Ya existe una cuenta con este correo.';
    if (msg?.includes('Email not confirmed')) return 'Debes confirmar tu correo antes de iniciar sesión.';
    if (msg?.includes('rate limit')) return 'Demasiados intentos. Espera unos minutos.';
    return UI.escHtml(msg || 'Error desconocido.');
  }

  // ── SIDEBAR ────────────────────────────────────────
  async function renderSidebar() {
    const profile = await Auth.getProfile();
    const user = await Auth.getUser();
    const nombre = profile?.nombre || user?.email?.split('@')[0] || 'Usuario';
    const initials = nombre.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();

    const navItems = [
      { id: 'dashboard', icon: '🏠', label: 'Panel principal' },
      { id: 'habilidades', icon: '🎯', label: 'Habilidades' },
      { id: 'retos', icon: '🏆', label: 'Retos' },
      { id: 'reportes', icon: '📊', label: 'Reportes' },
    ];

    document.getElementById('sidebar').innerHTML = `
      <div class="sidebar-logo">
        <div class="sidebar-logo-icon">🚀</div>
        <span class="sidebar-logo-text">SkillTrack</span>
      </div>
      <nav class="sidebar-nav" role="navigation" aria-label="Navegación principal">
        <div class="nav-section-title">Navegación</div>
        ${navItems.map(item => `
          <button class="nav-item${currentPage === item.id ? ' active' : ''}"
            id="nav-${item.id}" onclick="App.navigateTo('${item.id}')"
            aria-current="${currentPage === item.id ? 'page' : 'false'}">
            <span class="nav-icon" aria-hidden="true">${item.icon}</span>
            ${UI.escHtml(item.label)}
          </button>`).join('')}
      </nav>
      <div class="sidebar-footer">
        <div class="user-info">
          <div class="user-avatar" aria-hidden="true">${initials}</div>
          <div>
            <div class="user-name">${UI.escHtml(nombre)}</div>
            <div class="user-role">Usuario</div>
          </div>
        </div>
        <button class="nav-item" onclick="App.logout()" style="color:var(--accent-red);">
          <span class="nav-icon" aria-hidden="true">🚪</span> Cerrar sesión
        </button>
      </div>`;

    // Mobile close on nav click
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.addEventListener('click', closeMobileMenu);
    });
  }

  function updateActiveNav() {
    document.querySelectorAll('.nav-item[id^="nav-"]').forEach(btn => {
      const pageId = btn.id.replace('nav-', '');
      btn.classList.toggle('active', pageId === currentPage);
      btn.setAttribute('aria-current', pageId === currentPage ? 'page' : 'false');
    });
  }

  // ── PAGES ──────────────────────────────────────────
  const pages = {
    dashboard: {
      title: 'Panel principal',
      render: () => `
        <div class="page-content">
          <div id="welcome-banner"></div>
          <div id="stats-grid" class="stats-grid"></div>
          <div class="two-col" style="margin-bottom:1.25rem;">
            <div class="card">
              <div class="card-header">
                <span class="card-title">📊 Retos por estado</span>
              </div>
              <div id="donut-chart"></div>
            </div>
            <div class="card">
              <div class="card-header">
                <span class="card-title">📅 Actividad semanal</span>
              </div>
              <div id="weekly-chart"></div>
            </div>
          </div>
          <div class="two-col">
            <div class="card">
              <div class="card-header">
                <span class="card-title">⚠️ Fechas límite próximas</span>
              </div>
              <div id="deadline-alerts"></div>
            </div>
            <div class="card">
              <div class="card-header">
                <span class="card-title">🕐 Actividad reciente</span>
              </div>
              <div id="recent-activity"></div>
            </div>
          </div>
        </div>`
    },
    habilidades: {
      title: 'Habilidades',
      render: () => `
        <div class="page-content">
          <div class="page-header">
            <div>
              <h1>🎯 Habilidades</h1>
              <p>Gestiona las habilidades que estás desarrollando</p>
            </div>
            <button class="btn btn-primary" onclick="Habilidades.openForm()">+ Nueva habilidad</button>
          </div>
          <div class="search-filter-bar">
            <div class="search-input-wrap">
              <span class="search-icon">🔍</span>
              <input id="hab-search" type="search" placeholder="Buscar habilidades…" aria-label="Buscar habilidades">
            </div>
            <select class="filter-select" id="hab-filter-cat" aria-label="Filtrar por categoría">
              <option value="">Todas las categorías</option>
            </select>
            <select class="filter-select" id="hab-filter-nivel" aria-label="Filtrar por nivel">
              <option value="">Todos los niveles</option>
              <option>Principiante</option>
              <option>Intermedio</option>
              <option>Avanzado</option>
            </select>
          </div>
          <div id="habilidades-list"><div class="loading-overlay"><div class="loading-spinner"></div></div></div>
        </div>`
    },
    retos: {
      title: 'Retos',
      render: () => `
        <div class="page-content">
          <div class="page-header">
            <div>
              <h1>🏆 Retos</h1>
              <p>Crea y gestiona tus retos de aprendizaje</p>
            </div>
            <button class="btn btn-primary" onclick="Retos.openForm()">+ Nuevo reto</button>
          </div>
          <div class="search-filter-bar">
            <div class="search-input-wrap">
              <span class="search-icon">🔍</span>
              <input id="reto-search" type="search" placeholder="Buscar retos…" aria-label="Buscar retos">
            </div>
            <select class="filter-select" id="reto-filter-estado" aria-label="Filtrar por estado">
              <option value="">Todos los estados</option>
              <option>Pendiente</option>
              <option>En progreso</option>
              <option>Completado</option>
              <option>Cancelado</option>
            </select>
            <select class="filter-select" id="reto-filter-prioridad" aria-label="Filtrar por prioridad">
              <option value="">Todas las prioridades</option>
              <option>Alta</option>
              <option>Media</option>
              <option>Baja</option>
            </select>
            <select class="filter-select" id="reto-filter-hab" aria-label="Filtrar por habilidad">
              <option value="">Todas las habilidades</option>
            </select>
            <select class="filter-select" id="reto-sort" aria-label="Ordenar por">
              <option value="created_at">Más recientes</option>
              <option value="fecha_limite">Fecha límite</option>
              <option value="prioridad">Prioridad</option>
              <option value="progreso">Progreso</option>
            </select>
          </div>
          <div id="retos-list"><div class="loading-overlay"><div class="loading-spinner"></div></div></div>
        </div>`
    },
    reportes: {
      title: 'Reportes',
      render: () => `
        <div class="page-content">
          <div class="page-header">
            <div>
              <h1>📊 Reportes</h1>
              <p>Analiza tu progreso y exporta tus datos</p>
            </div>
            <button class="btn btn-success" id="rep-export-btn">📥 Exportar CSV</button>
          </div>
          <div class="card" style="margin-bottom:1.25rem;">
            <div class="card-header">
              <span class="card-title">🔍 Filtros del reporte</span>
            </div>
            <div class="report-filters">
              <div class="form-group" style="margin:0;flex:1;min-width:160px;">
                <label for="rep-fecha-desde">Desde</label>
                <input id="rep-fecha-desde" type="date">
              </div>
              <div class="form-group" style="margin:0;flex:1;min-width:160px;">
                <label for="rep-fecha-hasta">Hasta</label>
                <input id="rep-fecha-hasta" type="date">
              </div>
              <div class="form-group" style="margin:0;flex:1;min-width:140px;">
                <label for="rep-filter-estado">Estado de retos</label>
                <select id="rep-filter-estado" class="filter-select" style="width:100%;">
                  <option value="">Todos</option>
                  <option>Pendiente</option>
                  <option>En progreso</option>
                  <option>Completado</option>
                  <option>Cancelado</option>
                </select>
              </div>
            </div>
          </div>
          <div id="rep-summary" style="margin-bottom:1.25rem;"></div>
          <div class="two-col" style="margin-bottom:1.25rem;">
            <div class="card">
              <div class="card-header"><span class="card-title">🍩 Distribución por estado</span></div>
              <div id="rep-estado-chart"></div>
            </div>
            <div class="card">
              <div class="card-header"><span class="card-title">📅 Tiempo por semana</span></div>
              <div id="rep-weekly-minutes"></div>
            </div>
          </div>
          <div class="card" style="margin-bottom:1.25rem;">
            <div class="card-header"><span class="card-title">🎯 Progreso por habilidad</span></div>
            <div id="rep-hab-progress"></div>
          </div>
          <div class="card">
            <div class="card-header"><span class="card-title">📋 Historial de actividad</span></div>
            <div id="rep-historial"></div>
          </div>
        </div>`
    }
  };

  async function navigateTo(pageId) {
    if (!pages[pageId]) return;
    currentPage = pageId;

    // Update nav
    updateActiveNav();

    // Update topbar title
    const titleEl = document.getElementById('topbar-title');
    if (titleEl) titleEl.textContent = pages[pageId].title;

    // Render page
    const content = document.getElementById('page-body');
    if (content) content.innerHTML = pages[pageId].render();

    // Load data
    try {
      if (pageId === 'dashboard') await Dashboard.load();
      else if (pageId === 'habilidades') await Habilidades.load();
      else if (pageId === 'retos') await Retos.load();
      else if (pageId === 'reportes') await Reportes.load();
    } catch (err) {
      console.error('Error loading page:', err);
      UI.toast('Error al cargar la página: ' + err.message, 'error');
    }

    // Scroll to top
    window.scrollTo(0, 0);
  }

  // ── MOBILE MENU ────────────────────────────────────
  function toggleMobileMenu() {
    document.getElementById('sidebar')?.classList.toggle('open');
    document.getElementById('sidebar-overlay')?.classList.toggle('visible');
  }

  function closeMobileMenu() {
    document.getElementById('sidebar')?.classList.remove('open');
    document.getElementById('sidebar-overlay')?.classList.remove('visible');
  }

  // ── LOGOUT ─────────────────────────────────────────
  async function logout() {
    const ok = await UI.confirm({
      title: 'Cerrar sesión',
      message: '¿Estás seguro de que deseas cerrar sesión?',
      confirmText: 'Sí, cerrar sesión',
      danger: false
    });
    if (!ok) return;

    try {
      await Auth.logout();
      UI.toast('Sesión cerrada correctamente', 'info');
    } catch (err) {
      UI.toast('Error al cerrar sesión: ' + err.message, 'error');
    }
  }

  return { init, navigateTo, toggleMobileMenu, closeMobileMenu, logout, switchAuthMode, handleLogin, handleRegister, showForgotPassword };
})();
