// =====================================================
// SKILLTRACK - Retos Module
// =====================================================

const Retos = (() => {
  let allRetos = [];
  let filteredRetos = [];
  let searchTerm = '';
  let filterEstado = '';
  let filterPrioridad = '';
  let filterHabId = '';
  let sortBy = 'created_at';

  const ESTADOS = ['Pendiente', 'En progreso', 'Completado', 'Cancelado'];
  const PRIORIDADES = ['Baja', 'Media', 'Alta'];

  async function load() {
    await fetchAndRender();
  }

  async function fetchAndRender() {
    const uid = (await Auth.getUser()).id;

    const { data, error } = await db
      .from('retos')
      .select(`*, habilidades(nombre, nivel, categoria)`)
      .eq('usuario_id', uid)
      .order('created_at', { ascending: false });

    if (error) {
      UI.toast('Error al cargar retos: ' + error.message, 'error');
      return;
    }

    allRetos = data || [];
    updateHabilidadesFilter();
    applyFilters();
  }

  function updateHabilidadesFilter() {
    const sel = document.getElementById('reto-filter-hab');
    if (!sel) return;
    const habs = [...new Map(allRetos.filter(r => r.habilidades).map(r => [r.habilidad_id, r.habilidades])).entries()];
    sel.innerHTML = `<option value="">Todas las habilidades</option>` +
      habs.map(([id, h]) => `<option value="${id}"${String(filterHabId) === String(id) ? ' selected' : ''}>${UI.escHtml(h.nombre)}</option>`).join('');
  }

  function applyFilters() {
    let list = [...allRetos];
    if (searchTerm) list = list.filter(r => r.titulo.toLowerCase().includes(searchTerm.toLowerCase()));
    if (filterEstado) list = list.filter(r => r.estado === filterEstado);
    if (filterPrioridad) list = list.filter(r => r.prioridad === filterPrioridad);
    if (filterHabId) list = list.filter(r => String(r.habilidad_id) === String(filterHabId));

    if (sortBy === 'fecha_limite') {
      list.sort((a, b) => {
        if (!a.fecha_limite) return 1;
        if (!b.fecha_limite) return -1;
        return new Date(a.fecha_limite) - new Date(b.fecha_limite);
      });
    } else if (sortBy === 'prioridad') {
      const order = { Alta: 0, Media: 1, Baja: 2 };
      list.sort((a, b) => (order[a.prioridad] ?? 3) - (order[b.prioridad] ?? 3));
    } else if (sortBy === 'progreso') {
      list.sort((a, b) => b.progreso - a.progreso);
    }

    filteredRetos = list;
    render();
  }

  function render() {
    const container = document.getElementById('retos-list');
    if (!container) return;

    // Wire up controls
    wireControls();

    if (!filteredRetos.length) {
      container.innerHTML = UI.emptyState('🏆', 'Sin retos', allRetos.length
        ? 'Ningún reto coincide con los filtros actuales.'
        : 'Crea tu primer reto para comenzar a trackear tu progreso.',
        allRetos.length ? '' : `<button class="btn btn-primary" onclick="Retos.openForm()">+ Nuevo reto</button>`
      );
      return;
    }

    container.innerHTML = `<div class="cards-grid">
      ${filteredRetos.map(r => renderCard(r)).join('')}
    </div>`;
  }

  function wireControls() {
    const searchEl = document.getElementById('reto-search');
    const estadoEl = document.getElementById('reto-filter-estado');
    const prioEl = document.getElementById('reto-filter-prioridad');
    const habEl = document.getElementById('reto-filter-hab');
    const sortEl = document.getElementById('reto-sort');

    if (searchEl) { searchEl.value = searchTerm; searchEl.oninput = e => { searchTerm = e.target.value; applyFilters(); }; }
    if (estadoEl) { estadoEl.value = filterEstado; estadoEl.onchange = e => { filterEstado = e.target.value; applyFilters(); }; }
    if (prioEl) { prioEl.value = filterPrioridad; prioEl.onchange = e => { filterPrioridad = e.target.value; applyFilters(); }; }
    if (habEl) { habEl.onchange = e => { filterHabId = e.target.value; applyFilters(); }; }
    if (sortEl) { sortEl.value = sortBy; sortEl.onchange = e => { sortBy = e.target.value; applyFilters(); }; }
  }

  function renderCard(r) {
    const days = r.fecha_limite ? UI.daysUntil(r.fecha_limite) : null;
    const isOverdue = days !== null && days < 0 && r.estado !== 'Completado' && r.estado !== 'Cancelado';
    const isDueSoon = days !== null && days >= 0 && days <= 3 && r.estado !== 'Completado' && r.estado !== 'Cancelado';

    return `<div class="reto-card${isOverdue ? ' reto-overdue' : ''}">
      ${isOverdue ? `<div style="font-size:0.75rem;color:var(--accent-red);font-weight:600;margin-bottom:0.5rem;">🔴 Vencido hace ${Math.abs(days)} día(s)</div>` : ''}
      ${isDueSoon && !isOverdue ? `<div style="font-size:0.75rem;color:var(--accent-amber);font-weight:600;margin-bottom:0.5rem;">⚠️ Vence en ${days} día(s)</div>` : ''}
      <div class="reto-card-header">
        <div style="flex:1;min-width:0;">
          <div class="reto-card-title">${UI.escHtml(r.titulo)}</div>
        </div>
        <div style="display:flex;gap:0.375rem;flex-shrink:0;align-items:center;">
          ${UI.prioridadBadge(r.prioridad)}
        </div>
      </div>
      <div style="margin-bottom:0.75rem;display:flex;flex-wrap:wrap;gap:0.4rem;align-items:center;">
        ${UI.estadoBadge(r.estado)}
        ${r.habilidades ? `<span class="badge badge-violet">🎯 ${UI.escHtml(r.habilidades.nombre)}</span>` : ''}
      </div>
      ${r.descripcion ? `<p style="font-size:0.8125rem;color:var(--text-secondary);line-height:1.5;margin-bottom:0.75rem;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${UI.escHtml(r.descripcion)}</p>` : ''}
      <div style="margin-bottom:0.75rem;">${UI.progressBar(r.progreso)}</div>
      <div class="reto-card-meta">
        ${r.fecha_inicio ? `<span>📅 Inicio: ${UI.fmtDate(r.fecha_inicio)}</span>` : ''}
        ${r.fecha_limite ? `<span>🎯 Límite: ${UI.fmtDate(r.fecha_limite)}</span>` : ''}
      </div>
      <div class="reto-actions">
        <button class="btn btn-ghost" onclick="Avances.openModal(${r.id})" style="font-size:0.8rem;padding:0.4rem 0.7rem;">📝 Avances</button>
        <button class="btn-icon" onclick="Retos.openForm(${r.id})" title="Editar" aria-label="Editar reto">✏️</button>
        <button class="btn-icon danger" onclick="Retos.deleteReto(${r.id})" title="Eliminar" aria-label="Eliminar reto">🗑️</button>
      </div>
    </div>`;
  }

  async function openForm(id = null) {
    const isEdit = id !== null;
    let reto = null;

    if (isEdit) {
      reto = allRetos.find(r => r.id === id);
      if (!reto) { UI.toast('Reto no encontrado', 'error'); return; }
    }

    const uid = (await Auth.getUser()).id;
    const { data: habs } = await db.from('habilidades').select('id, nombre').eq('usuario_id', uid).order('nombre');

    const today = new Date().toISOString().slice(0, 10);

    const bodyHtml = `
      <div class="form-group">
        <label for="reto-titulo">Título <span style="color:var(--accent-red)">*</span></label>
        <input id="reto-titulo" type="text" maxlength="150" placeholder="ej. Completar curso de React" value="${UI.escHtml(reto?.titulo || '')}" required>
      </div>
      <div class="form-group">
        <label for="reto-desc">Descripción</label>
        <textarea id="reto-desc" maxlength="1000" placeholder="Describe el reto y sus objetivos…">${UI.escHtml(reto?.descripcion || '')}</textarea>
      </div>
      <div class="form-group">
        <label for="reto-hab">Habilidad asociada</label>
        <select id="reto-hab">
          <option value="">— Sin habilidad —</option>
          ${(habs || []).map(h => `<option value="${h.id}"${String(reto?.habilidad_id) === String(h.id) ? ' selected' : ''}>${UI.escHtml(h.nombre)}</option>`).join('')}
        </select>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label for="reto-fecha-inicio">Fecha inicio</label>
          <input id="reto-fecha-inicio" type="date" value="${reto?.fecha_inicio || today}">
        </div>
        <div class="form-group">
          <label for="reto-fecha-limite">Fecha límite</label>
          <input id="reto-fecha-limite" type="date" value="${reto?.fecha_limite || ''}">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label for="reto-prioridad">Prioridad</label>
          <select id="reto-prioridad">
            ${PRIORIDADES.map(p => `<option${p === (reto?.prioridad || 'Media') ? ' selected' : ''}>${UI.escHtml(p)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label for="reto-estado">Estado</label>
          <select id="reto-estado">
            ${ESTADOS.map(e => `<option${e === (reto?.estado || 'Pendiente') ? ' selected' : ''}>${UI.escHtml(e)}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-group">
        <label for="reto-progreso">Progreso: <span id="reto-pct-label">${reto?.progreso || 0}%</span></label>
        <input id="reto-progreso" type="range" min="0" max="100" step="1" value="${reto?.progreso || 0}" class="range-slider">
      </div>
      <div id="reto-form-error"></div>`;

    const footerHtml = `
      <button class="btn btn-ghost" id="reto-cancel">Cancelar</button>
      <button class="btn btn-primary" id="reto-save">${isEdit ? 'Guardar cambios' : 'Crear reto'}</button>`;

    const m = UI.modal({ title: isEdit ? 'Editar reto' : 'Nuevo reto', body: bodyHtml, footer: footerHtml });

    const progressInput = m.el.querySelector('#reto-progreso');
    const pctLabel = m.el.querySelector('#reto-pct-label');
    progressInput.addEventListener('input', () => {
      pctLabel.textContent = progressInput.value + '%';
      const estadoSel = m.el.querySelector('#reto-estado');
      if (parseInt(progressInput.value) === 100 && estadoSel.value !== 'Completado') {
        estadoSel.value = 'Completado';
      } else if (parseInt(progressInput.value) < 100 && estadoSel.value === 'Completado') {
        estadoSel.value = 'En progreso';
      }
    });

    m.el.querySelector('#reto-cancel').addEventListener('click', m.close);
    m.el.querySelector('#reto-save').addEventListener('click', () => saveReto(m, reto, isEdit));
    m.el.querySelector('#reto-titulo').focus();
  }

  async function saveReto(m, reto, isEdit) {
    const titulo = m.el.querySelector('#reto-titulo').value.trim();
    const descripcion = m.el.querySelector('#reto-desc').value.trim() || null;
    const habId = m.el.querySelector('#reto-hab').value || null;
    const fechaInicio = m.el.querySelector('#reto-fecha-inicio').value;
    const fechaLimite = m.el.querySelector('#reto-fecha-limite').value || null;
    const prioridad = m.el.querySelector('#reto-prioridad').value;
    const estado = m.el.querySelector('#reto-estado').value;
    const progreso = parseInt(m.el.querySelector('#reto-progreso').value);
    const errEl = m.el.querySelector('#reto-form-error');

    errEl.innerHTML = '';

    if (!titulo) { errEl.innerHTML = `<div class="alert alert-error">El título es obligatorio.</div>`; return; }
    if (fechaLimite && fechaInicio && fechaLimite < fechaInicio) {
      errEl.innerHTML = `<div class="alert alert-error">La fecha límite debe ser posterior a la fecha de inicio.</div>`; return;
    }

    const saveBtn = m.el.querySelector('#reto-save');
    UI.setButtonLoading(saveBtn, true);

    try {
      const uid = (await Auth.getUser()).id;
      const payload = {
        titulo, descripcion,
        habilidad_id: habId ? parseInt(habId) : null,
        fecha_inicio: fechaInicio,
        fecha_limite: fechaLimite,
        prioridad, estado, progreso
      };

      if (isEdit) {
        const { error } = await db.from('retos').update(payload).eq('id', reto.id).eq('usuario_id', uid);
        if (error) throw error;
        UI.toast('Reto actualizado correctamente', 'success');
      } else {
        const { error } = await db.from('retos').insert({ ...payload, usuario_id: uid });
        if (error) throw error;
        UI.toast('Reto creado correctamente', 'success');
      }

      m.close();
      await fetchAndRender();
    } catch (err) {
      UI.setButtonLoading(saveBtn, false);
      errEl.innerHTML = `<div class="alert alert-error">${UI.escHtml(err.message)}</div>`;
    }
  }

  async function deleteReto(id) {
    const reto = allRetos.find(r => r.id === id);
    if (!reto) return;

    const ok = await UI.confirm({
      title: 'Eliminar reto',
      message: `¿Eliminar "${reto.titulo}"? Se eliminarán también todos sus avances registrados.`,
      confirmText: 'Eliminar',
      danger: true
    });
    if (!ok) return;

    const uid = (await Auth.getUser()).id;
    const { error } = await db.from('retos').delete().eq('id', id).eq('usuario_id', uid);
    if (error) {
      UI.toast('Error al eliminar: ' + error.message, 'error');
      return;
    }
    UI.toast('Reto eliminado', 'success');
    await fetchAndRender();
  }

  async function updateProgreso(id, progreso, estado) {
    const uid = (await Auth.getUser()).id;
    const { error } = await db.from('retos')
      .update({ progreso, ...(estado ? { estado } : {}) })
      .eq('id', id)
      .eq('usuario_id', uid);
    if (error) throw error;
    const reto = allRetos.find(r => r.id === id);
    if (reto) { reto.progreso = progreso; if (estado) reto.estado = estado; }
  }

  function getAll() { return allRetos; }
  function getById(id) { return allRetos.find(r => r.id === id) || null; }

  return { load, openForm, deleteReto, updateProgreso, getAll, getById };
})();
