// =====================================================
// SKILLTRACK - Dashboard Module
// =====================================================

const Dashboard = (() => {

  async function load() {
    const user = await Auth.getUser();
    const profile = await Auth.getProfile();
    const nombre = profile?.nombre || user?.email?.split('@')[0] || 'Usuario';

    renderWelcome(nombre);
    await loadStats();
    await loadCharts();
    await loadDeadlineAlerts();
    await loadRecentActivity();
  }

  function renderWelcome(nombre) {
    const now = new Date();
    const hour = now.getHours();
    const greeting = hour < 12 ? '¡Buenos días' : hour < 18 ? '¡Buenas tardes' : '¡Buenas noches';
    const el = document.getElementById('welcome-banner');
    if (!el) return;
    el.innerHTML = `
      <div class="welcome-banner">
        <h2>${UI.escHtml(greeting)}, ${UI.escHtml(nombre)}! 🚀</h2>
        <p>Aquí tienes un resumen de tu progreso en SkillTrack.</p>
      </div>`;
  }

  async function loadStats() {
    const uid = (await Auth.getUser()).id;

    const [
      { data: habs },
      { data: retos }
    ] = await Promise.all([
      db.from('habilidades').select('id', { count: 'exact', head: false }).eq('usuario_id', uid),
      db.from('retos').select('estado, progreso').eq('usuario_id', uid)
    ]);

    const totalHabs = habs?.length || 0;
    const pendientes = retos?.filter(r => r.estado === 'Pendiente').length || 0;
    const enProgreso = retos?.filter(r => r.estado === 'En progreso').length || 0;
    const completados = retos?.filter(r => r.estado === 'Completado').length || 0;
    const totalRetos = retos?.length || 0;
    const promedioProgreso = totalRetos
      ? Math.round(retos.reduce((a, r) => a + r.progreso, 0) / totalRetos)
      : 0;

    const { data: avances } = await db
      .from('avances')
      .select('minutos_dedicados')
      .eq('usuario_id', uid);
    const totalMinutos = avances?.reduce((a, v) => a + (v.minutos_dedicados || 0), 0) || 0;

    const el = document.getElementById('stats-grid');
    if (!el) return;

    el.innerHTML = `
      <div class="stat-card" style="--card-accent:var(--accent-violet);--icon-bg:rgba(124,58,237,0.15);--icon-color:var(--accent-violet-light);">
        <div class="stat-icon">🎯</div>
        <div>
          <div class="stat-value">${totalHabs}</div>
          <div class="stat-label">Habilidades</div>
        </div>
      </div>
      <div class="stat-card" style="--card-accent:var(--accent-amber);--icon-bg:rgba(245,158,11,0.15);--icon-color:var(--accent-amber);">
        <div class="stat-icon">⏳</div>
        <div>
          <div class="stat-value">${pendientes}</div>
          <div class="stat-label">Pendientes</div>
        </div>
      </div>
      <div class="stat-card" style="--card-accent:var(--accent-blue);--icon-bg:rgba(59,130,246,0.15);--icon-color:var(--accent-blue);">
        <div class="stat-icon">🔥</div>
        <div>
          <div class="stat-value">${enProgreso}</div>
          <div class="stat-label">En progreso</div>
        </div>
      </div>
      <div class="stat-card" style="--card-accent:var(--accent-green);--icon-bg:rgba(16,185,129,0.15);--icon-color:var(--accent-green);">
        <div class="stat-icon">✅</div>
        <div>
          <div class="stat-value">${completados}</div>
          <div class="stat-label">Completados</div>
        </div>
      </div>
      <div class="stat-card" style="--card-accent:var(--accent-violet);--icon-bg:rgba(124,58,237,0.12);--icon-color:var(--accent-violet-light);">
        <div class="stat-icon">📊</div>
        <div>
          <div class="stat-value">${promedioProgreso}%</div>
          <div class="stat-label">Progreso general</div>
        </div>
      </div>
      <div class="stat-card" style="--card-accent:var(--accent-green);--icon-bg:rgba(16,185,129,0.12);--icon-color:var(--accent-green);">
        <div class="stat-icon">⏱️</div>
        <div>
          <div class="stat-value">${formatMinutes(totalMinutos)}</div>
          <div class="stat-label">Tiempo dedicado</div>
        </div>
      </div>`;
  }

  function formatMinutes(min) {
    if (min < 60) return `${min}m`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }

  async function loadCharts() {
    await Promise.all([renderDonutChart(), renderWeeklyChart()]);
  }

  async function renderDonutChart() {
    const uid = (await Auth.getUser()).id;
    const { data: retos } = await db
      .from('retos').select('estado').eq('usuario_id', uid);

    const counts = { 'Pendiente': 0, 'En progreso': 0, 'Completado': 0, 'Cancelado': 0 };
    retos?.forEach(r => { if (counts[r.estado] !== undefined) counts[r.estado]++; });

    const segments = [
      { label: 'Pendiente', value: counts['Pendiente'], color: '#94a3b8' },
      { label: 'En progreso', value: counts['En progreso'], color: '#3b82f6' },
      { label: 'Completado', value: counts['Completado'], color: '#10b981' },
      { label: 'Cancelado', value: counts['Cancelado'], color: '#ef4444' },
    ].filter(s => s.value > 0);

    const el = document.getElementById('donut-chart');
    if (!el) return;

    if (!segments.length) {
      el.innerHTML = `<div class="empty-state" style="padding:1.5rem;">
        <div style="font-size:2rem;">📭</div><p>Sin retos aún</p></div>`;
      return;
    }

    el.innerHTML = `<div class="donut-chart-wrap">
      ${UI.donutSvg(segments)}
      <div class="donut-legend">
        ${segments.map(s => `
          <div class="donut-legend-item">
            <span class="legend-dot" style="background:${s.color}"></span>
            <span style="flex:1;">${UI.escHtml(s.label)}</span>
            <span style="font-weight:600;">${s.value}</span>
          </div>`).join('')}
      </div>
    </div>`;
  }

  async function renderWeeklyChart() {
    const uid = (await Auth.getUser()).id;
    const today = new Date();
    const days = [];
    const labels = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().slice(0, 10));
    }

    const { data: avances } = await db
      .from('avances')
      .select('fecha, minutos_dedicados')
      .eq('usuario_id', uid)
      .gte('fecha', days[0]);

    const minutesByDay = {};
    avances?.forEach(a => { minutesByDay[a.fecha] = (minutesByDay[a.fecha] || 0) + (a.minutos_dedicados || 0); });

    const items = days.map((d, i) => ({
      label: labels[new Date(d + 'T12:00:00').getDay() === 0 ? 6 : new Date(d + 'T12:00:00').getDay() - 1],
      value: minutesByDay[d] || 0,
      color: d === today.toISOString().slice(0, 10)
        ? 'linear-gradient(180deg,var(--accent-green),#059669)'
        : 'linear-gradient(180deg,var(--accent-violet-light),var(--accent-violet-dark))'
    }));

    const el = document.getElementById('weekly-chart');
    if (!el) return;
    el.innerHTML = UI.barChart(items) + `<p style="font-size:0.75rem;color:var(--text-muted);text-align:center;margin-top:0.25rem;">Minutos dedicados esta semana</p>`;
  }

  async function loadDeadlineAlerts() {
    const uid = (await Auth.getUser()).id;
    const today = new Date();
    const in7 = new Date(); in7.setDate(in7.getDate() + 7);

    const { data: retos } = await db
      .from('retos')
      .select('id, titulo, fecha_limite, estado')
      .eq('usuario_id', uid)
      .not('estado', 'in', '("Completado","Cancelado")')
      .not('fecha_limite', 'is', null)
      .lte('fecha_limite', in7.toISOString().slice(0, 10))
      .order('fecha_limite');

    const el = document.getElementById('deadline-alerts');
    if (!el) return;

    if (!retos?.length) {
      el.innerHTML = `<p style="font-size:0.875rem;color:var(--text-muted);">Sin fechas límite próximas. ¡Vas muy bien! 🎉</p>`;
      return;
    }

    el.innerHTML = retos.map(r => {
      const days = UI.daysUntil(r.fecha_limite);
      const isOverdue = days < 0;
      const isToday = days === 0;
      const msg = isOverdue ? `Vencido hace ${Math.abs(days)} día(s)` :
                  isToday ? 'Vence hoy' : `Vence en ${days} día(s)`;
      return `<div class="deadline-alert${isOverdue ? ' overdue' : ''}">
        <span>${isOverdue ? '🔴' : '⚠️'}</span>
        <div style="flex:1;">
          <div style="font-weight:600;margin-bottom:0.125rem;">${UI.escHtml(r.titulo)}</div>
          <div style="font-size:0.75rem;opacity:0.8;">${msg} — ${UI.fmtDate(r.fecha_limite)}</div>
        </div>
        <button class="btn btn-ghost" style="padding:0.3rem 0.5rem;font-size:0.75rem;"
          onclick="App.navigateTo('retos')">Ver</button>
      </div>`;
    }).join('');
  }

  async function loadRecentActivity() {
    const uid = (await Auth.getUser()).id;

    const { data: avances } = await db
      .from('avances')
      .select(`id, fecha, descripcion, porcentaje, minutos_dedicados, created_at,
               retos(titulo)`)
      .eq('usuario_id', uid)
      .order('created_at', { ascending: false })
      .limit(8);

    const el = document.getElementById('recent-activity');
    if (!el) return;

    if (!avances?.length) {
      el.innerHTML = UI.emptyState('📝', 'Sin actividad', 'Registra avances en tus retos para ver tu historial aquí.');
      return;
    }

    el.innerHTML = `<div style="padding:0 0.25rem;">
      ${avances.map(a => `
        <div class="avance-item">
          <div class="avance-dot"></div>
          <div style="flex:1;min-width:0;">
            <div style="font-size:0.8125rem;font-weight:600;color:var(--accent-violet-light);">${UI.escHtml(a.retos?.titulo || '—')}</div>
            <div class="avance-desc">${UI.escHtml(a.descripcion)}</div>
            <div class="avance-meta">
              <span>📅 ${UI.fmtDate(a.fecha)}</span>
              <span>📈 ${a.porcentaje}%</span>
              ${a.minutos_dedicados ? `<span>⏱️ ${a.minutos_dedicados}m</span>` : ''}
            </div>
          </div>
        </div>`).join('')}
    </div>`;
  }

  return { load };
})();
