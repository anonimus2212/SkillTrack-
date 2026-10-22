// =====================================================
// SKILLTRACK - Habilidades Module
// =====================================================

const Habilidades = (() => {
  const NIVELES = ['Principiante', 'Intermedio', 'Avanzado'];
  let allHabs = [];
  let filteredHabs = [];
  let searchTerm = '';
  let filterCat = '';
  let filterNivel = '';

  async function load() {
    await fetchAndRender();
  }

  async function fetchAndRender() {
    const uid = (await Auth.getUser()).id;

    const { data, error } = await db
      .from('habilidades')
      .select('*')
      .eq('usuario_id', uid)
      .order('created_at', { ascending: false });

    if (error) {
      UI.toast('Error al cargar habilidades: ' + error.message, 'error');
      return;
    }

    // Count retos per habilidad
    const ids = data?.map(h => h.id) || [];
    let retosCounts = {};
    if (ids.length) {
      const { data: retosData } = await db
        .from('retos')
        .select('habilidad_id')
        .eq('usuario_id', uid)
        .in('habilidad_id', ids);
      retosData?.forEach(r => {
        if (r.habilidad_id) retosCounts[r.habilidad_id] = (retosCounts[r.habilidad_id] || 0) + 1;
      });
    }

    allHabs = (data || []).map(h => ({ ...h, retosCount: retosCounts[h.id] || 0 }));
    applyFilters();
  }

  function applyFilters() {
    filteredHabs = allHabs.filter(h => {
      const matchSearch = !searchTerm || h.nombre.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCat = !filterCat || h.categoria === filterCat;
      const matchNivel = !filterNivel || h.nivel === filterNivel;
      return matchSearch && matchCat && matchNivel;
    });
    render();
  }

  function getCategorias() {
    const cats = [...new Set(allHabs.map(h => h.categoria))].filter(Boolean);
    return cats.sort();
  }

  function render() {
    const container = document.getElementById('habilidades-list');
    if (!container) return;

    // Search/filter bar
    const cats = getCategorias();
    document.getElementById('hab-search')?.removeEventListener('input', onSearch);
    document.getElementById('hab-filter-cat')?.removeEventListener('change', onFilterCat);
    document.getElementById('hab-filter-nivel')?.removeEventListener('change', onFilterNivel);

    // Update categories in select
    const catSel = document.getElementById('hab-filter-cat');
    if (catSel) {
      const current = catSel.value;
      catSel.innerHTML = `<option value="">Todas las categorías</option>` +
        cats.map(c => `<option value="${UI.escHtml(c)}"${c === current ? ' selected' : ''}>${UI.escHtml(c)}</option>`).join('');
    }

    document.getElementById('hab-search')?.addEventListener('input', onSearch);
    document.getElementById('hab-filter-cat')?.addEventListener('change', onFilterCat);
    document.getElementById('hab-filter-nivel')?.addEventListener('change', onFilterNivel);

    if (!filteredHabs.length) {
      container.innerHTML = UI.emptyState('🎯', 'Sin habilidades', allHabs.length
        ? 'Ninguna habilidad coincide con los filtros actuales.'
        : 'Crea tu primera habilidad para comenzar tu ruta de aprendizaje.',
        allHabs.length ? '' : `<button class="btn btn-primary" onclick="Habilidades.openForm()">+ Nueva habilidad</button>`
      );
      return;
    }

    container.innerHTML = `<div class="cards-grid">
      ${filteredHabs.map(h => renderCard(h)).join('')}
    </div>`;
  }

  function renderCard(h) {
    return `<div class="card" style="display:flex;flex-direction:column;gap:0.75rem;">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:0.5rem;">
        <div style="flex:1;min-width:0;">
          <div style="font-size:0.9375rem;font-weight:700;margin-bottom:0.25rem;">${UI.escHtml(h.nombre)}</div>
          <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
            ${UI.nivelBadge(h.nivel)}
            <span class="badge badge-violet">${UI.escHtml(h.categoria)}</span>
          </div>
        </div>
        <div style="display:flex;gap:0.375rem;flex-shrink:0;">
          <button class="btn-icon" onclick="Habilidades.openForm(${h.id})" title="Editar" aria-label="Editar habilidad">✏️</button>
          <button class="btn-icon danger" onclick="Habilidades.deleteHab(${h.id})" title="Eliminar" aria-label="Eliminar habilidad">🗑️</button>
        </div>
      </div>
      ${h.descripcion ? `<p style="font-size:0.8125rem;color:var(--text-secondary);line-height:1.5;">${UI.escHtml(h.descripcion)}</p>` : ''}
      <div style="display:flex;align-items:center;justify-content:space-between;padding-top:0.5rem;border-top:1px solid var(--border);margin-top:auto;">
        <span style="font-size:0.8rem;color:var(--text-muted);">📅 ${UI.fmtDate(h.created_at)}</span>
        <span style="font-size:0.8rem;font-weight:600;color:${h.retosCount ? 'var(--accent-violet-light)' : 'var(--text-muted)'};">
          ${h.retosCount} reto${h.retosCount !== 1 ? 's' : ''}
        </span>
      </div>
    </div>`;
  }

  function onSearch(e) { searchTerm = e.target.value; applyFilters(); }
  function onFilterCat(e) { filterCat = e.target.value; applyFilters(); }
  function onFilterNivel(e) { filterNivel = e.target.value; applyFilters(); }

  async function openForm(id = null) {
    const isEdit = id !== null;
    let hab = null;

    if (isEdit) {
      hab = allHabs.find(h => h.id === id);
      if (!hab) {
        UI.toast('Habilidad no encontrada', 'error');
        return;
      }
    }

    const bodyHtml = `
      <div class="form-group">
        <label for="hab-nombre">Nombre <span style="color:var(--accent-red)">*</span></label>
        <input id="hab-nombre" type="text" maxlength="100" placeholder="ej. JavaScript ES2024" value="${UI.escHtml(hab?.nombre || '')}" required>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label for="hab-categoria">Categoría <span style="color:var(--accent-red)">*</span></label>
          <input id="hab-categoria" type="text" maxlength="50" placeholder="ej. Programación" value="${UI.escHtml(hab?.categoria || 'General')}" required>
        </div>
        <div class="form-group">
          <label for="hab-nivel">Nivel <span style="color:var(--accent-red)">*</span></label>
          <select id="hab-nivel">
            ${NIVELES.map(n => `<option${n === (hab?.nivel || 'Principiante') ? ' selected' : ''}>${UI.escHtml(n)}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-group">
        <label for="hab-desc">Descripción</label>
        <textarea id="hab-desc" maxlength="500" placeholder="Describe brevemente esta habilidad…">${UI.escHtml(hab?.descripcion || '')}</textarea>
      </div>
      <div id="hab-form-error"></div>`;

    const footerHtml = `
      <button class="btn btn-ghost" id="hab-cancel">Cancelar</button>
      <button class="btn btn-primary" id="hab-save">${isEdit ? 'Guardar cambios' : 'Crear habilidad'}</button>`;

    const m = UI.modal({
      title: isEdit ? 'Editar habilidad' : 'Nueva habilidad',
      body: bodyHtml,
      footer: footerHtml
    });

    m.el.querySelector('#hab-cancel').addEventListener('click', m.close);
    m.el.querySelector('#hab-save').addEventListener('click', () => saveHab(m, hab, isEdit));
    m.el.querySelector('#hab-nombre').focus();
  }

  async function saveHab(m, hab, isEdit) {
    const nombre = m.el.querySelector('#hab-nombre').value.trim();
    const categoria = m.el.querySelector('#hab-categoria').value.trim();
    const nivel = m.el.querySelector('#hab-nivel').value;
    const descripcion = m.el.querySelector('#hab-desc').value.trim() || null;
    const errEl = m.el.querySelector('#hab-form-error');

    errEl.innerHTML = '';

    if (!nombre) { errEl.innerHTML = `<div class="alert alert-error">El nombre es obligatorio.</div>`; return; }
    if (!categoria) { errEl.innerHTML = `<div class="alert alert-error">La categoría es obligatoria.</div>`; return; }

    const saveBtn = m.el.querySelector('#hab-save');
    UI.setButtonLoading(saveBtn, true);

    try {
      const uid = (await Auth.getUser()).id;
      const payload = { nombre, categoria, nivel, descripcion };

      if (isEdit) {
        const { error } = await db.from('habilidades').update(payload).eq('id', hab.id).eq('usuario_id', uid);
        if (error) throw error;
        UI.toast('Habilidad actualizada correctamente', 'success');
      } else {
        const { error } = await db.from('habilidades').insert({ ...payload, usuario_id: uid });
        if (error) throw error;
        UI.toast('Habilidad creada correctamente', 'success');
      }

      m.close();
      await fetchAndRender();
    } catch (err) {
      UI.setButtonLoading(saveBtn, false);
      const msg = err.message?.includes('unique') ? 'Ya existe una habilidad con ese nombre.' : err.message;
      errEl.innerHTML = `<div class="alert alert-error">${UI.escHtml(msg)}</div>`;
    }
  }

  async function deleteHab(id) {
    const hab = allHabs.find(h => h.id === id);
    if (!hab) return;

    if (hab.retosCount > 0) {
      const ok = await UI.confirm({
        title: 'Eliminar habilidad',
        message: `"${hab.nombre}" tiene ${hab.retosCount} reto(s) asociado(s). Al eliminarla, los retos quedarán sin habilidad asignada. ¿Continuar?`,
        confirmText: 'Sí, eliminar',
        danger: true
      });
      if (!ok) return;
    } else {
      const ok = await UI.confirm({
        title: 'Eliminar habilidad',
        message: `¿Eliminar "${hab.nombre}"? Esta acción no se puede deshacer.`,
        confirmText: 'Eliminar',
        danger: true
      });
      if (!ok) return;
    }

    const uid = (await Auth.getUser()).id;
    const { error } = await db.from('habilidades').delete().eq('id', id).eq('usuario_id', uid);
    if (error) {
      UI.toast('Error al eliminar: ' + error.message, 'error');
      return;
    }
    UI.toast('Habilidad eliminada', 'success');
    await fetchAndRender();
  }

  function getAll() { return allHabs; }

  return { load, openForm, deleteHab, getAll };
})();
