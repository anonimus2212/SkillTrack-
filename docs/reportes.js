// =====================================================
// SKILLTRACK - Reportes Module
// =====================================================

const Reportes = (() => {
  let currentData = {};
  let dateFrom = '';
  let dateTo = '';
  let filterEstado = '';

  async function load() {
    setDefaultDates();
    wireControls();
    await fetchAndRender();
  }

  function setDefaultDates() {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    dateFrom = firstDay.toISOString().slice(0, 10);
    dateTo = now.toISOString().slice(0, 10);

    const fromEl = document.getElementById('rep-fecha-desde');
    const toEl = document.getElementById('rep-fecha-hasta');
    if (fromEl) fromEl.value = dateFrom;
    if (toEl) toEl.value = dateTo;
  }

  function wireControls() {
    document.getElementById('rep-fecha-desde')?.addEventListener('change', e => { dateFrom = e.target.value; fetchAndRender(); });
    document.getElementById('rep-fecha-hasta')?.addEventListener('change', e => { dateTo = e.target.value; fetchAndRender(); });
    document.getElementById('rep-filter-estado')?.addEventListener('change', e => { filterEstado = e.target.value; fetchAndRender(); });
    document.getElementById('rep-export-btn')?.addEventListener('click', exportCSV);
  }

  async function fetchAndRender() {
    const uid = (await Auth.getUser()).id;
    showLoading();

    const [retosRes, avancesRes, habsRes] = await Promise.all([
      db.from('retos').select('*, habilidades(nombre)').eq('usuario_id', uid),
      db.from('avances').select('*').eq('usuario_id', uid)
        .gte('fecha', dateFrom).lte('fecha', dateTo),
      db.from('habilidades').select('id, nombre').eq('usuario_id', uid)
    ]);

    let retos = retosRes.data || [];
    if (filterEstado) retos = retos.filter(r => r.estado === filterEstado);

    currentData = { retos, avances: avancesRes.data || [], habilidades: habsRes.data || [] };

    renderSummaryCards();
    renderEstadoChart();
    renderHabilidadProgress();
    renderWeeklyMinutes();
    renderHistorial();
  }

  function showLoading() {
    ['rep-summary', 'rep-estado-chart', 'rep-hab-progress', 'rep-weekly-minutes', 'rep-historial'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = `<div class="loading-overlay"><div class="loading-spinner"></div></div>`;
    });
  }

  function renderSummaryCards() {
    const { retos, avances } = currentData;
    const el = document.getElementById('rep-summary');
    if (!el) return;

    const completados = retos.filter(r => r.estado === 'Completado').length;
    const pendientes = retos.filter(r => r.estado === 'Pendiente').length;
    const enProgreso = retos.filter(r => r.estado === 'En progreso').length;
    const totalMin = avances.reduce((a, v) => a + (v.minutos_dedicados || 0), 0);
    const pctCompletados = retos.length ? Math.round((completados / retos.length) * 100) : 0;

    el.innerHTML = `
      <div class="stats-grid" style="margin-bottom:0;">
        <div class="stat-card" style="--card-accent:var(--accent-green);--icon-bg:rgba(16,185,129,0.15);--icon-color:var(--accent-green);">
          <div class="stat-icon">✅</div>
          <div><div class="stat-value">${completados}</div><div class="stat-label">Completados</div></div>
        </div>
        <div class="stat-card" style="--card-accent:var(--accent-amber);--icon-bg:rgba(245,158,11,0.15);--icon-color:var(--accent-amber);">
          <div class="stat-icon">⏳</div>
          <div><div class="stat-value">${pendientes}</div><div class="stat-label">Pendientes</div></div>
        </div>
        <div class="stat-card" style="--card-accent:var(--accent-blue);--icon-bg:rgba(59,130,246,0.15);--icon-color:var(--accent-blue);">
          <div class="stat-icon">🔥</div>
          <div><div class="stat-value">${enProgreso}</div><div class="stat-label">En progreso</div></div>
        </div>
        <div class="stat-card" style="--card-accent:var(--accent-violet);--icon-bg:rgba(124,58,237,0.12);--icon-color:var(--accent-violet-light);">
          <div class="stat-icon">📊</div>
          <div><div class="stat-value">${pctCompletados}%</div><div class="stat-label">Tasa de éxito</div></div>
        </div>
        <div class="stat-card" style="--card-accent:var(--accent-green);--icon-bg:rgba(16,185,129,0.12);--icon-color:var(--accent-green);">
          <div class="stat-icon">⏱️</div>
          <div><div class="stat-value">${formatMin(totalMin)}</div><div class="stat-label">Tiempo en período</div></div>
        </div>
        <div class="stat-card" style="--card-accent:var(--accent-amber);--icon-bg:rgba(245,158,11,0.12);--icon-color:var(--accent-amber);">
          <div class="stat-icon">📝</div>
          <div><div class="stat-value">${avances.length}</div><div class="stat-label">Sesiones registradas</div></div>
        </div>
      </div>`;
  }

  function renderEstadoChart() {
    const { retos } = currentData;
    const el = document.getElementById('rep-estado-chart');
    if (!el) return;

    const counts = { 'Completado': 0, 'En progreso': 0, 'Pendiente': 0, 'Cancelado': 0 };
    retos.forEach(r => { if (counts[r.estado] !== undefined) counts[r.estado]++; });

    const segments = [
      { label: 'Completado', value: counts['Completado'], color: '#10b981' },
      { label: 'En progreso', value: counts['En progreso'], color: '#3b82f6' },
      { label: 'Pendiente', value: counts['Pendiente'], color: '#94a3b8' },
      { label: 'Cancelado', value: counts['Cancelado'], color: '#ef4444' },
    ].filter(s => s.value > 0);

    if (!segments.length) {
      el.innerHTML = UI.emptyState('📊', 'Sin datos', 'No hay retos en el período seleccionado.');
      return;
    }

    el.innerHTML = `<div class="donut-chart-wrap">
      ${UI.donutSvg(segments, 130)}
      <div class="donut-legend">
        ${segments.map(s => `
          <div class="donut-legend-item">
            <span class="legend-dot" style="background:${s.color}"></span>
            <span style="flex:1;">${UI.escHtml(s.label)}</span>
            <strong>${s.value}</strong>
          </div>`).join('')}
      </div>
    </div>`;
  }

  function renderHabilidadProgress() {
    const { retos, habilidades } = currentData;
    const el = document.getElementById('rep-hab-progress');
    if (!el) return;

    const habMap = {};
    retos.forEach(r => {
      if (!r.habilidad_id || !r.habilidades) return;
      if (!habMap[r.habilidad_id]) habMap[r.habilidad_id] = { nombre: r.habilidades.nombre, total: 0, sum: 0, completados: 0 };
      habMap[r.habilidad_id].total++;
      habMap[r.habilidad_id].sum += r.progreso;
      if (r.estado === 'Completado') habMap[r.habilidad_id].completados++;
    });

    const rows = Object.values(habMap).sort((a, b) => (b.sum / b.total) - (a.sum / a.total));

    if (!rows.length) {
      el.innerHTML = UI.emptyState('🎯', 'Sin datos', 'Asigna habilidades a tus retos para ver el progreso aquí.');
      return;
    }

    el.innerHTML = rows.map(h => {
      const avg = Math.round(h.sum / h.total);
      return `<div style="margin-bottom:0.875rem;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.375rem;">
          <span style="font-size:0.875rem;font-weight:600;">${UI.escHtml(h.nombre)}</span>
          <span style="font-size:0.8rem;color:var(--text-secondary);">${h.completados}/${h.total} completados</span>
        </div>
        ${UI.progressBar(avg, 8)}
      </div>`;
    }).join('');
  }

  function renderWeeklyMinutes() {
    const { avances } = currentData;
    const el = document.getElementById('rep-weekly-minutes');
    if (!el) return;

    if (!avances.length) {
      el.innerHTML = UI.emptyState('📅', 'Sin sesiones', 'No hay sesiones registradas en este período.');
      return;
    }

    // Group by week
    const weekMap = {};
    avances.forEach(a => {
      const d = new Date(a.fecha + 'T12:00:00');
      const monday = new Date(d);
      monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
      const key = monday.toISOString().slice(0, 10);
      weekMap[key] = (weekMap[key] || 0) + (a.minutos_dedicados || 0);
    });

    const weeks = Object.entries(weekMap).sort(([a], [b]) => a.localeCompare(b)).slice(-8);
    const items = weeks.map(([d, v]) => ({
      label: new Date(d + 'T12:00:00').toLocaleDateString('es-MX', { month: 'short', day: 'numeric' }),
      value: v
    }));

    el.innerHTML = UI.barChart(items) + `<p style="font-size:0.75rem;color:var(--text-muted);text-align:center;margin-top:0.5rem;">Minutos por semana</p>`;
  }

  function renderHistorial() {
    const { avances, retos } = currentData;
    const el = document.getElementById('rep-historial');
    if (!el) return;

    const retoMap = {};
    retos.forEach(r => { retoMap[r.id] = r.titulo; });

    const sorted = [...avances].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    if (!sorted.length) {
      el.innerHTML = UI.emptyState('📝', 'Sin actividad', 'No hay sesiones registradas en este período.');
      return;
    }

    el.innerHTML = `<div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Reto</th>
            <th>Descripción</th>
            <th>% Avance</th>
            <th>Tiempo</th>
          </tr>
        </thead>
        <tbody>
          ${sorted.map(a => `
            <tr>
              <td style="white-space:nowrap;">${UI.fmtDate(a.fecha)}</td>
              <td>${UI.escHtml(retoMap[a.reto_id] || '—')}</td>
              <td style="max-width:280px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${UI.escHtml(a.descripcion)}">${UI.escHtml(a.descripcion)}</td>
              <td>${a.porcentaje}%</td>
              <td>${a.minutos_dedicados ? a.minutos_dedicados + 'm' : '—'}</td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
  }

  function exportCSV() {
    const { avances, retos } = currentData;
    if (!avances.length) { UI.toast('No hay datos para exportar en el período seleccionado.', 'warning'); return; }

    const retoMap = {};
    retos.forEach(r => { retoMap[r.id] = r.titulo; });

    const headers = ['Fecha', 'Reto', 'Descripcion', 'Porcentaje', 'Minutos'];
    const rows = avances.map(a => [
      a.fecha,
      `"${(retoMap[a.reto_id] || '').replace(/"/g, '""')}"`,
      `"${(a.descripcion || '').replace(/"/g, '""')}"`,
      a.porcentaje,
      a.minutos_dedicados || 0
    ]);

    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `skilltrack-reporte-${dateFrom}-${dateTo}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    UI.toast('CSV exportado correctamente', 'success');
  }

  function formatMin(min) {
    if (min < 60) return `${min}m`;
    const h = Math.floor(min / 60);
    const m2 = min % 60;
    return m2 > 0 ? `${h}h ${m2}m` : `${h}h`;
  }

  return { load };
})();
